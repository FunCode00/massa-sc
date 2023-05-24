import { stringToBytes } from '@massalabs/as-types';
import { SwapToken, Token, LiquidityPool } from '../contracts/main';

describe('Massa Smart Contract', () => {
  let swapSystem: SwapToken;

  beforeEach(() => {
    swapSystem = new SwapToken();
    // Add tokens and liquidity pools for testing
    swapSystem.addToken('TokenA');
    swapSystem.addToken('TokenB');
    swapSystem.addLiquidityPool('TokenA', 'TokenB', 100, 200);
  });

  describe('getTokenBalance', () => {
    it('should return the balance of a token', () => {
      const balance = swapSystem.getTokenBalance('TokenA');
      expect(balance).toBe(0);
    });

    it('should return 0 for non-existing token', () => {
      const balance = swapSystem.getTokenBalance('TokenC');
      expect(balance).toBe(0);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate the price of Token A in terms of Token B', () => {
      const price = swapSystem.calculatePrice('TokenA', 'TokenB');
      expect(price).toBe(100);
    });

    it('should return 0 for non-existing liquidity pool', () => {
      const price = swapSystem.calculatePrice('TokenA', 'TokenC');
      expect(price).toBe(0);
    });
  });

  describe('addLiquidity', () => {
    it('should add liquidity to a liquidity pool', () => {
      swapSystem.addLiquidity('TokenA', 'TokenB', 50, 100);
      const liquidityPool = swapSystem.liquidityPools.get('TokenA-TokenB') as LiquidityPool;
      expect(liquidityPool.tokenA.balance).toBe(50);
      expect(liquidityPool.tokenB.balance).toBe(300);
      expect(liquidityPool.reserveA).toBe(150);
      expect(liquidityPool.reserveB).toBe(400);
    });

    it('should not add liquidity for non-existing tokens', () => {
      swapSystem.addLiquidity('TokenA', 'TokenC', 50, 100);
      const liquidityPool = swapSystem.liquidityPools.get('TokenA-TokenC');
      expect(liquidityPool);
    });
  });

  describe('swapTokens', () => {
    it('should swap tokens between two tokens in a liquidity pool', () => {
      const tokenA = swapSystem.tokens.get('TokenA') as Token;
      const tokenB = swapSystem.tokens.get('TokenB') as Token;

      tokenA.balance = 200;
      tokenB.balance = 400;

      swapSystem.swapTheToken('TokenA', 'TokenB', 'TokenA', 'TokenB', 100);

      expect(tokenA.balance).toBe(100);
      expect(tokenB.balance).toBe(500);
    });

    it('should not swap tokens for insufficient balance', () => {
      const tokenA = swapSystem.tokens.get('TokenA') as Token;
      const tokenB = swapSystem.tokens.get('TokenB') as Token;

      tokenA.balance = 50;
      tokenB.balance = 200;

      swapSystem.swapTheToken('TokenA', 'TokenB', 'TokenA', 'TokenB', 100);

      expect(tokenA.balance).toBe(50);
      expect(tokenB.balance).toBe(200);
    });

    it('should not swap tokens for non-existing liquidity pool', () => {
      const tokenA = swapSystem.tokens.get('TokenA') as Token;
      const tokenB = swapSystem.tokens.get('TokenB') as Token;

      tokenA.balance = 200;
      tokenB.balance = 400;

      swapSystem.swapTheToken('TokenA', 'TokenC', 'TokenA', 'TokenB', 100);

      expect(tokenA.balance).toBe(200);
      expect(tokenB.balance).toBe(400);
    });

    it('should not swap tokens for non-existing from token', () => {
      const tokenA = swapSystem.tokens.get('TokenA') as Token;
      const tokenB = swapSystem.tokens.get('TokenB') as Token;

      tokenA.balance = 200;
      tokenB.balance = 400;

      swapSystem.swapTheToken('TokenA', 'TokenB', 'TokenC', 'TokenB', 100);

      expect(tokenA.balance).toBe(200);
      expect(tokenB.balance).toBe(400);
    });

    it('should not swap tokens for non-existing to token', () => {
      const tokenA = swapSystem.tokens.get('TokenA') as Token;
      const tokenB = swapSystem.tokens.get('TokenB') as Token;

      tokenA.balance = 200;
      tokenB.balance = 400;

      swapSystem.swapTheToken('TokenA', 'TokenB', 'TokenA', 'TokenC', 100);

      expect(tokenA.balance).toBe(200);
      expect(tokenB.balance).toBe(400);
    });
  });
});


