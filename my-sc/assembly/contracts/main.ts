// The entry file of your WebAssembly module.
import { callerHasWriteAccess, generateEvent } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';

/**
 * Represent Token
 */
export class Token {
  public balance: u64;

  constructor (public name: string) {
    this.balance = 0;
  }
}

/**
 * Represents a liquidity pool in the swap system.
 */
export class LiquidityPool {
  constructor(public tokenA: Token, public tokenB: Token, public reserveA: u64, public reserveB: u64) {}

  /**
   * Calculates the price of Token A in terms of Token B.
   * @returns The price of Token A in terms of Token B.
   */
  calculatePrice(): u64 {
    if (this.reserveB === 0) {
      return 0;
    }

    return (this.reserveA * this.tokenB.balance) / this.reserveB;
  }

  /**
   * Adds liquidity to the pool by depositing tokens.
   * @param amountA - The amount of Token A to deposit.
   * @param amountB - The amount of Token B to deposit.
   */
  addLiquidity(amountA: u64, amountB: u64): void {
    this.tokenA.balance += amountA;
    this.tokenB.balance += amountB;
    this.reserveA += amountA;
    this.reserveB += amountB;
  }

  /**
   * Swaps tokens between Token A and Token B.
   * @param fromToken - The token to swap from.
   * @param toToken - The token to swap to.
   * @param amount - The amount of tokens to swap.
   */
  swapTokens(fromToken: Token, toToken: Token, amount: u64): void {
    if (fromToken.balance < amount) {
      return;
    }

    const amountOut = this.calculateSwapAmountOut(fromToken, toToken, amount);
    if (amountOut === 0) {
      return;
    }

    fromToken.balance -= amount;
    toToken.balance += amountOut;
    this.reserveA += amount;
    this.reserveB -= amountOut;

    generateEvent(`Swapped ${amount} ${fromToken.name} for ${amountOut} ${toToken.name}`);
  }

  /**
   * Calculates the amount of tokens received in a swap.
   * @param fromToken - The token to swap from.
   * @param toToken - The token to swap to.
   * @param amountIn - The amount of tokens to swap.
   * @returns The amount of tokens received in the swap.
   */
  calculateSwapAmountOut(fromToken: Token, toToken: Token, amountIn: u64): u64 {
    const amountInWithFee = amountIn * 997;
    const numerator = amountInWithFee * this.reserveB;
    const denominator = (fromToken.balance * 1000) + amountInWithFee;
    return numerator / denominator;
  }
}

/**
 * Represent Swap System
 */
export class SwapToken {
  public tokens: Map<string, Token>;
  public liquidityPools: Map<string, LiquidityPool>;

  constructor() {
    this.tokens = new Map<string, Token>();
    this.liquidityPools = new Map<string, LiquidityPool>();
  }

  /**
   * Add Token to swap system
   * @param name - name of the token
   */
  addToken(name: string): void {
    const token = new Token(name);
    this.tokens.set(name, token);
  }

  /**
   * Adds a liquidity pool to the swap system.
   * @param tokenAName - The name of Token A in the pool.
   * @param tokenBName - The name of Token B in the pool.
   * @param reserveA - The initial reserve of Token A.
   * @param reserveB - The initial reserve of Token B.
   */
  addLiquidityPool(tokenAName: string, tokenBName: string, reserveA: u64, reserveB: u64): void {
    const tokenA = this.tokens.get(tokenAName);
    const tokenB = this.tokens.get(tokenBName);

    if (!tokenA || !tokenB) {
      return;
    }

    const liquidityPool = new LiquidityPool(tokenA, tokenB, reserveA, reserveB);
    this.liquidityPools.set(`${tokenAName}-${tokenBName}`, liquidityPool);
  }

  /**
   * Checks the balance of a token.
   * @param tokenName - The name of the token.
   * @returns The balance of the token.
   */
  getTokenBalance(tokenName: string): u64 {
    const token = this.tokens.get(tokenName);
    return token ? token.balance : 0;
  }

  /**
   * Calculates the price of Token A in terms of Token B in a liquidity pool.
   * @param tokenAName - The name of Token A in the pool.
   * @param tokenBName - The name of Token B in the pool.
   * @returns The price of Token A in terms of Token B.
   */
  calculatePrice(tokenAName: string, tokenBName: string): u64 {
    const liquidityPool = this.liquidityPools.get(`${tokenAName}-${tokenBName}`);
    return liquidityPool ? liquidityPool.calculatePrice() : 0;
  }

  /**
   * Adds liquidity to a liquidity pool.
   * @param tokenAName - The name of Token A in the pool.
   * @param tokenBName - The name of Token B in the pool.
   * @param amountA - The amount of Token A to deposit.
   * @param amountB - The amount of Token B to deposit.
   */
  addLiquidity(tokenAName: string, tokenBName: string, amountA: u64, amountB: u64): void {
    const liquidityPool = this.liquidityPools.get(`${tokenAName}-${tokenBName}`);
    if (!liquidityPool) {
      return;
    }
    liquidityPool.addLiquidity(amountA, amountB);
  }




  /**
   * Swaps tokens between two accounts.
   * @param from - The account to swap tokens from.
   * @param to - The account to swap tokens to.
   * @param tokenName - The name of the token to swap.
   * @param amount - The amount of tokens to swap.
   */
  swapTheToken(tokenAName: string, tokenBName: string, fromTokenName: string, toTokenName: string, amount: u64): void {
    const liquidityPool = this.liquidityPools.get(`${tokenAName}-${tokenBName}`);
    const fromToken = this.tokens.get(fromTokenName);
    const toToken = this.tokens.get(toTokenName);

    if (!liquidityPool || !fromToken || !toToken) { return }

    liquidityPool.swapTokens(fromToken, toToken, amount);

  }
}

const swapSystem = new SwapToken();

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 */
export function constructor(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  if (!callerHasWriteAccess()) {
    return [];
  }

  const argsDeser = new Args(binaryArgs);
  const name = argsDeser.nextString().expect('Name argument is missing or invalid');
  generateEvent(`Constructor called with name ${name}`);

  // Add example tokens to the swap system
  swapSystem.addToken('TokenA');
  swapSystem.addToken('TokenB');

  // Add example liquidity pool
  swapSystem.addLiquidityPool('TokenA', 'TokenB', 100, 200);

  return [];
}

/**
 * Checks the balance of a token.
 *
 * @param binaryArgs - Arguments serialized with Args
 * @returns The balance of the token serialized in bytes.
 */
export function getTokenBalance(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const argsDeser = new Args(binaryArgs);
  const tokenName = argsDeser.nextString().expect('Token name argument is missing or invalid');

  const balance = swapSystem.getTokenBalance(tokenName);

  return stringToBytes(balance.toString());
}

/**
 * Calculates the price of Token A in terms of Token B in a liquidity pool.
 *
 * @param binaryArgs - Arguments serialized with Args
 * @returns The price of Token A in terms of Token B serialized in bytes.
 */
export function calculatePrice(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const argsDeser = new Args(binaryArgs);
  const tokenAName = argsDeser.nextString().expect('Token A name argument is missing or invalid');
  const tokenBName = argsDeser.nextString().expect('Token B name argument is missing or invalid');

  const price = swapSystem.calculatePrice(tokenAName, tokenBName);

  return stringToBytes(price.toString());
}

/**
 * Adds liquidity to a liquidity pool.
 *
 * @param binaryArgs - Arguments serialized with Args
 * @returns An empty array.
 */
export function addLiquidity(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  if (!callerHasWriteAccess()) {
    return [];
  }

  const argsDeser = new Args(binaryArgs);
  const tokenAName = argsDeser.nextString().expect('Token A name argument is missing or invalid');
  const tokenBName = argsDeser.nextString().expect('Token B name argument is missing or invalid');
  const amountA = argsDeser.nextU64().expect('Amount A argument is missing or invalid');
  const amountB = argsDeser.nextU64().expect('Amount B argument is missing or invalid');

  swapSystem.addLiquidity(tokenAName, tokenBName, amountA, amountB);

  return [];
}

/**
 * Swaps tokens between two accounts.
 *
 * @param binaryArgs - Arguments serialized with Args
 * @returns the emitted event serialized in bytes
 */
export function swapTokens(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  if (!callerHasWriteAccess()) {
    return [];
  }

  const argsDeser = new Args(binaryArgs);
  const fromTokenName = argsDeser.nextString().expect('From argument is missing or invalid');
  const toTokenName = argsDeser.nextString().expect('To argument is missing or invalid');
  const tokenAName = argsDeser.nextString().expect('Token name argument is missing or invalid');
  const tokenBName = argsDeser.nextString().expect('Token B name argument is missing or invalid');
  const amount = argsDeser.nextU64().expect('Amount argument is missing or invalid');

  swapSystem.swapTheToken(tokenAName, tokenBName, fromTokenName, toTokenName, amount);

  return [];
}

/**
 * @param _ - not used 
 * @returns the emitted event serialized in bytes
 */
export function event(_: StaticArray<u8>): StaticArray<u8> {
  const message = "I'm an event!";
  generateEvent(message);
  return stringToBytes(message);
}