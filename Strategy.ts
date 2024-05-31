import { NAVISDKClient } from "navi-sdk";
import dotenv from 'dotenv';
import {pool, Sui, USDC, USDT, WETH, CETUS, vSui, haSui, NAVX} from "navi-sdk/dist/address";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {stakeTovSui, depositCoin, flashloan, borrowCoin, repayFlashLoan, SignAndSubmitTXB} from 'navi-sdk/dist/libs/PTB'
import { CoinInfo, Pool, PoolConfig } from "navi-sdk/dist/types";
import assert from 'assert';
dotenv.config();

const mnemonic = process.env.MNEMONIC;
const client= new NAVISDKClient({
    mnemonic: mnemonic,
});

const account = client.accounts[0];
const sender = account.address;
console.log("Address: ", account.address);

// Configruation Zone
const riskRate = 2; //This is the risk rate of the strategy, loop 3 times
assert!(riskRate <= 3, "Risk rate should be not be greater than 3");

//--------------------- Transaction Block ---------------------
let txb = new TransactionBlock();
txb.setSender(sender);
// txb.setGasBudget(1e9)
// Strategy step: stake Sui to get vSui
const walletbalance = await account.getWalletBalance(); //100Sui
const suiBalance = Number(walletbalance[Sui.address as keyof typeof walletbalance] * 1e9) - 1e9; //All Available Sui Balance


const sourceTokenObjAddress = await account.getCoins(vSui);

const amountToLoan = BigInt(suiBalance * riskRate / 4) // 75Sui

const loanPoolConfig: PoolConfig = pool[Sui.symbol as keyof Pool];
const [balance, receipt] = await flashloan(txb, loanPoolConfig, Number(amountToLoan)); // Flashloan 1 USDC


const suiCoinFlashloaned = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balance],
    typeArguments: [loanPoolConfig.type],
});

txb.mergeCoins(txb.gas, [suiCoinFlashloaned]);

const [SuiToken] = txb.splitCoins(txb.gas, [suiBalance * (1 + riskRate/4) - 1e9]);

const vSuiCoin = await stakeTovSui(txb, SuiToken)
const toDepositAmount = Math.ceil(suiBalance * (1 + riskRate/4));
const sourceTokenObj = txb.object(sourceTokenObjAddress.data[0].coinObjectId);

txb.mergeCoins(sourceTokenObj, [vSuiCoin]);
// const vSuiAmount = txb.moveCall({
//     target: '0x2::coin::value',
//     arguments: [vSuiCoin],
//     typeArguments: [vSui.address],
// })

const supplyPoolConfig: PoolConfig = pool[vSui.symbol as keyof Pool];
const borrowPoolConfig: PoolConfig = pool[Sui.symbol as keyof Pool];

await depositCoin(txb,supplyPoolConfig, sourceTokenObj, Math.ceil(toDepositAmount*0.9))

const [borrowedSuiCoin] = await borrowCoin(txb, borrowPoolConfig, Math.ceil(Number(amountToLoan) * 1.01))

const borrowedBalance = txb.moveCall({
    target: '0x2::coin::into_balance',
    arguments: [borrowedSuiCoin],
    typeArguments: [borrowPoolConfig.type],
});

const [leftBalance] = await repayFlashLoan(txb, loanPoolConfig, receipt, borrowedBalance); // left balance after repaying with the balance

//Extra token after repay
const extraCoin = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [leftBalance],
    typeArguments: [loanPoolConfig.type],
});

txb.transferObjects([extraCoin], sender);

const result = SignAndSubmitTXB(txb, account.client, account.keypair);







