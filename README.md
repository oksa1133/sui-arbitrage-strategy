# Sui-NAVIStrategy

## Introduction

This project implements a flashloan strategy using the `navi-sdk` library. The strategy involves staking Sui to obtain vSui, taking out a flashloan, borrowing coins, and repaying the flashloan, all within a single transaction block. This script is designed to work with the Sui blockchain.


## Prerequisites
* Node.js installed on your machine
* `npm` or `yarn` installed for package management
* An environment file (.env) with the following variables:
* MNEMONIC: The mnemonic phrase for your wallet

## Risk Management
NAVI support up to 3x loop, I keep the health factor to around 1.7.