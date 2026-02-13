use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("3p6L6xhYmiuHFqDvNZyJnvQ5d6c9Nhy5D673kDdsrW7h");

#[program]
pub mod indie_star_market {
    use super::*;

    /// Initialize a new prediction market for an Indie.fun project
    /// Creates YES and NO token mints and sets up the initial market state
    pub fn initialize(
        ctx: Context<Initialize>,
        fundraising_goal: u64,
        deadline: i64,
        project_name: String,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // Validate deadline is in the future
        require!(
            deadline > clock.unix_timestamp,
            ErrorCode::InvalidDeadline
        );

        // Initialize market state
        market.authority = ctx.accounts.authority.key();
        market.yes_mint = ctx.accounts.yes_mint.key();
        market.no_mint = ctx.accounts.no_mint.key();
        market.usdc_mint = ctx.accounts.usdc_mint.key();
        market.fundraising_goal = fundraising_goal;
        market.deadline = deadline;
        market.project_name = project_name;
        market.yes_liquidity = 0;
        market.no_liquidity = 0;
        market.usdc_liquidity = 0;
        market.is_settled = false;
        market.winning_outcome = None;
        market.bump = ctx.bumps.market;

        msg!(
            "Market initialized: {} | Goal: {} USDC | Deadline: {}",
            market.project_name,
            fundraising_goal,
            deadline
        );

        Ok(())
    }

    /// Buy YES or NO tokens using USDC
    /// Implements AMM pricing: x * y = k (constant product)
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        amount_usdc: u64,
        outcome: Outcome,
    ) -> Result<u64> {
        let clock = Clock::get()?;
        
        // Get account info before mutable borrow
        let market_account_info = ctx.accounts.market.to_account_info();
        
        // Read market state (immutable borrow)
        let market = &ctx.accounts.market;
        
        // Check market is not settled
        require!(!market.is_settled, ErrorCode::MarketSettled);
        require!(clock.unix_timestamp < market.deadline, ErrorCode::DeadlinePassed);

        // Extract values before mutable borrows
        let bump = market.bump;
        let authority = market.authority;
        let project_name = market.project_name.clone();
        let current_usdc_liquidity = market.usdc_liquidity;
        let (mint, _liquidity_account, current_liquidity) = match outcome {
            Outcome::Yes => (
                &ctx.accounts.yes_mint,
                &ctx.accounts.yes_liquidity_account,
                market.yes_liquidity,
            ),
            Outcome::No => (
                &ctx.accounts.no_mint,
                &ctx.accounts.no_liquidity_account,
                market.no_liquidity,
            ),
        };

        // Calculate tokens to mint using AMM formula: x * y = k
        // If no liquidity exists, use 1:1 ratio
        let tokens_to_mint = if current_liquidity == 0 {
            amount_usdc
        } else {
            // AMM calculation: new_tokens = (amount_usdc * current_liquidity) / (usdc_liquidity + amount_usdc)
            let numerator = amount_usdc
                .checked_mul(current_liquidity)
                .ok_or(ErrorCode::MathOverflow)?;
            let denominator = current_usdc_liquidity
                .checked_add(amount_usdc)
                .ok_or(ErrorCode::MathOverflow)?;
            numerator
                .checked_div(denominator)
                .ok_or(ErrorCode::MathOverflow)?
        };

        // Transfer USDC from user to liquidity pool
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_usdc_account.to_account_info(),
                to: ctx.accounts.usdc_liquidity_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount_usdc)?;

        // Mint tokens to user
        let seeds = &[
            b"market_v2".as_ref(),
            authority.as_ref(),
            project_name.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: market_account_info.clone(),
            },
            signer,
        );
        token::mint_to(mint_ctx, tokens_to_mint)?;

        // Update liquidity (now we can mutably borrow)
        let market = &mut ctx.accounts.market;
        match outcome {
            Outcome::Yes => {
                market.yes_liquidity = market.yes_liquidity
                    .checked_add(tokens_to_mint)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            Outcome::No => {
                market.no_liquidity = market.no_liquidity
                    .checked_add(tokens_to_mint)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
        }
        market.usdc_liquidity = market
            .usdc_liquidity
            .checked_add(amount_usdc)
            .ok_or(ErrorCode::MathOverflow)?;

        msg!(
            "Bought {} {} tokens for {} USDC",
            tokens_to_mint,
            match outcome {
                Outcome::Yes => "YES",
                Outcome::No => "NO",
            },
            amount_usdc
        );

        Ok(tokens_to_mint)
    }

    /// Sell YES or NO tokens back for USDC
    /// Implements AMM pricing: x * y = k (constant product)
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        amount_tokens: u64,
        outcome: Outcome,
    ) -> Result<u64> {
        let clock = Clock::get()?;
        
        // Get account info before mutable borrow
        let market_account_info = ctx.accounts.market.to_account_info();
        
        // Read market state (immutable borrow)
        let market = &ctx.accounts.market;

        // Check market is not settled
        require!(!market.is_settled, ErrorCode::MarketSettled);
        require!(clock.unix_timestamp < market.deadline, ErrorCode::DeadlinePassed);

        // Extract values before mutable borrows
        let bump = market.bump;
        let authority = market.authority;
        let project_name = market.project_name.clone();
        let current_usdc_liquidity = market.usdc_liquidity;
        let (mint, _liquidity_account, current_liquidity) = match outcome {
            Outcome::Yes => (
                &ctx.accounts.yes_mint,
                &ctx.accounts.yes_liquidity_account,
                market.yes_liquidity,
            ),
            Outcome::No => (
                &ctx.accounts.no_mint,
                &ctx.accounts.no_liquidity_account,
                market.no_liquidity,
            ),
        };

        // Validate sufficient liquidity
        require!(
            current_liquidity >= amount_tokens,
            ErrorCode::InsufficientLiquidity
        );

        // Calculate USDC to return using AMM formula
        let usdc_to_return = if current_usdc_liquidity == 0 {
            0
        } else {
            // AMM calculation: usdc_out = (amount_tokens * usdc_liquidity) / (current_liquidity + amount_tokens)
            let numerator = amount_tokens
                .checked_mul(current_usdc_liquidity)
                .ok_or(ErrorCode::MathOverflow)?;
            let denominator = current_liquidity
                .checked_add(amount_tokens)
                .ok_or(ErrorCode::MathOverflow)?;
            numerator
                .checked_div(denominator)
                .ok_or(ErrorCode::MathOverflow)?
        };

        // Burn tokens from user (user is the authority of their own token account)
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, amount_tokens)?;

        // Prepare signer seeds for USDC transfer from liquidity pool
        let seeds = &[
            b"market_v2".as_ref(),
            authority.as_ref(),
            project_name.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer USDC from liquidity pool to user
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.usdc_liquidity_account.to_account_info(),
                to: ctx.accounts.user_usdc_account.to_account_info(),
                authority: market_account_info.clone(),
            },
            signer,
        );
        token::transfer(transfer_ctx, usdc_to_return)?;

        // Update liquidity (now we can mutably borrow)
        let market = &mut ctx.accounts.market;
        match outcome {
            Outcome::Yes => {
                market.yes_liquidity = market.yes_liquidity
                    .checked_sub(amount_tokens)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            Outcome::No => {
                market.no_liquidity = market.no_liquidity
                    .checked_sub(amount_tokens)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
        }
        market.usdc_liquidity = market
            .usdc_liquidity
            .checked_sub(usdc_to_return)
            .ok_or(ErrorCode::MathOverflow)?;

        msg!(
            "Sold {} {} tokens for {} USDC",
            amount_tokens,
            match outcome {
                Outcome::Yes => "YES",
                Outcome::No => "NO",
            },
            usdc_to_return
        );

        Ok(usdc_to_return)
    }

    /// Settle the market after the deadline
    /// Only callable by the market authority
    /// Sets the winning outcome based on whether the fundraising goal was met
    pub fn settle_market(
        ctx: Context<SettleMarket>,
        fundraising_result: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // Check deadline has passed
        require!(
            clock.unix_timestamp >= market.deadline,
            ErrorCode::DeadlineNotPassed
        );
        require!(!market.is_settled, ErrorCode::MarketAlreadySettled);

        // Determine winning outcome
        let winning_outcome = if fundraising_result >= market.fundraising_goal {
            Outcome::Yes
        } else {
            Outcome::No
        };

        market.is_settled = true;
        market.winning_outcome = Some(winning_outcome);

        msg!(
            "Market settled: {} | Goal: {} | Result: {} | Winner: {:?}",
            market.project_name,
            market.fundraising_goal,
            fundraising_result,
            winning_outcome
        );

        Ok(())
    }

    /// Redeem winning tokens for USDC after market settlement
    /// Only holders of winning outcome tokens can redeem 1:1 for USDC
    pub fn redeem_tokens(ctx: Context<RedeemTokens>, amount: u64) -> Result<()> {
        // Get account info before mutable operations
        let market_account_info = ctx.accounts.market.to_account_info();
        
        // Read market state (immutable borrow)
        let market = &ctx.accounts.market;

        require!(market.is_settled, ErrorCode::MarketNotSettled);
        require!(
            market.winning_outcome.is_some(),
            ErrorCode::MarketNotSettled
        );

        let winning_outcome = market.winning_outcome.ok_or(ErrorCode::MarketNotSettled)?;
        let (mint, _) = match winning_outcome {
            Outcome::Yes => (&ctx.accounts.yes_mint, &ctx.accounts.no_mint),
            Outcome::No => (&ctx.accounts.no_mint, &ctx.accounts.yes_mint),
        };

        // Verify user is redeeming the correct token
        require!(
            ctx.accounts.user_token_account.mint == mint.key(),
            ErrorCode::WrongTokenType
        );

        // Extract values
        let bump = market.bump;
        let authority = market.authority;
        let project_name = market.project_name.clone();

        // Burn winning tokens (user is the authority of their own token account)
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, amount)?;

        // Prepare signer seeds for USDC transfer from liquidity pool
        let seeds = &[
            b"market_v2".as_ref(),
            authority.as_ref(),
            project_name.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer USDC 1:1 to user
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.usdc_liquidity_account.to_account_info(),
                to: ctx.accounts.user_usdc_account.to_account_info(),
                authority: market_account_info.clone(),
            },
            signer,
        );
        token::transfer(transfer_ctx, amount)?;

        msg!("Redeemed {} winning tokens for {} USDC", amount, amount);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(fundraising_goal: u64, deadline: i64, project_name: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MarketState::LEN,
        seeds = [b"market_v2", authority.key().as_ref(), project_name.as_bytes()],
        bump
    )]
    pub market: Account<'info, MarketState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub yes_mint: Account<'info, Mint>,
    pub no_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [b"liquidity", market.key().as_ref(), b"yes"],
        bump,
        token::mint = yes_mint,
        token::authority = market,
    )]
    pub yes_liquidity_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"liquidity", market.key().as_ref(), b"no"],
        bump,
        token::mint = no_mint,
        token::authority = market,
    )]
    pub no_liquidity_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"liquidity", market.key().as_ref(), b"usdc"],
        bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub usdc_liquidity_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketState>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub yes_mint: AccountInfo<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub no_mint: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"yes"],
        bump
    )]
    pub yes_liquidity_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"no"],
        bump
    )]
    pub no_liquidity_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"usdc"],
        bump
    )]
    pub usdc_liquidity_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketState>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub yes_mint: AccountInfo<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub no_mint: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"yes"],
        bump
    )]
    pub yes_liquidity_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"no"],
        bump
    )]
    pub no_liquidity_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"usdc"],
        bump
    )]
    pub usdc_liquidity_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub market: Account<'info, MarketState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokens<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketState>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub yes_mint: AccountInfo<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub no_mint: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"liquidity", market.key().as_ref(), b"usdc"],
        bump
    )]
    pub usdc_liquidity_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct MarketState {
    pub authority: Pubkey,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub fundraising_goal: u64,
    pub deadline: i64,
    pub project_name: String,
    pub yes_liquidity: u64,
    pub no_liquidity: u64,
    pub usdc_liquidity: u64,
    pub is_settled: bool,
    pub winning_outcome: Option<Outcome>,
    pub bump: u8,
}

impl MarketState {
    pub const LEN: usize = 32 + // authority
        32 + // yes_mint
        32 + // no_mint
        32 + // usdc_mint
        8 +  // fundraising_goal
        8 +  // deadline
        4 + 256 + // project_name (4 byte prefix + max 256 chars)
        8 +  // yes_liquidity
        8 +  // no_liquidity
        8 +  // usdc_liquidity
        1 +  // is_settled
        1 + 1 + // winning_outcome (Option<Outcome>)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum Outcome {
    Yes,
    No,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid deadline - must be in the future")]
    InvalidDeadline,
    #[msg("Market has already been settled")]
    MarketSettled,
    #[msg("Market deadline has passed")]
    DeadlinePassed,
    #[msg("Market deadline has not passed yet")]
    DeadlineNotPassed,
    #[msg("Market has already been settled")]
    MarketAlreadySettled,
    #[msg("Market has not been settled yet")]
    MarketNotSettled,
    #[msg("Insufficient liquidity in the pool")]
    InsufficientLiquidity,
    #[msg("Wrong token type for redemption")]
    WrongTokenType,
    #[msg("Unauthorized - only market authority can perform this action")]
    Unauthorized,
    #[msg("Math overflow occurred")]
    MathOverflow,
}
