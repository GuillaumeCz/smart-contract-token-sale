/*
Main BlockFoodCoin test driven development test

- test constructor
    - make sure data is store properly

- test participate
    - make sure amount is correctly stored
    - make sure it respects the current exchange rate
    -

- test erc20 classic stuff
    - transfer
        - only if unlocked

- test finalize
    - only callable by owner
    - make sure it respects the min cap
    - make sure it unlocks transfer
    - make sure if balance < min cap to unlock refund
    - make sur it sends the ether to the recipient

 */
const config = require('../token-sale/config')

const BlockFoodCoin = artifacts.require('./BlockFoodCoin.sol')

const getBalance = (addr) => new Promise((resolve, reject) =>
    web3.eth.getBalance(addr, (err, result) => {
        if (err) {
            console.log('Failed to get balance', err)
            reject(err)
        } else {
            resolve(result)
        }
    })
)

let timeAdjustement = 0
const getCurrentDate = (diffInSeconds) => ~~((Date.now() + (diffInSeconds + timeAdjustement) * 1000) / 1000)

const expectFailure = async (promise, errorMessage) => {
    let hasFailed
    try {
        await promise
        hasFailed = false
    } catch (e) {
        hasFailed = true
    }
    assert.equal(hasFailed, true, errorMessage)
}

contract('BlockFoodCoin', function (accounts) {

    it('should properly set the values from the constructor', async () => {
        const instance = await BlockFoodCoin.deployed()

        const [
            owner,
            target,
            phase1Date,
            phase2Date,
            phase3Date,
            phase4Date,
            endDate,
            phase1Rate,
            phase2Rate,
            phase3Rate,
            phase4Rate,
            minCap,
            maxCap,
            symbol,
            name
        ] = await Promise.all([
            instance.owner(),
            instance.target(),
            instance.phase1Date(),
            instance.phase2Date(),
            instance.phase3Date(),
            instance.phase4Date(),
            instance.endDate(),
            instance.phase1Rate(),
            instance.phase2Rate(),
            instance.phase3Rate(),
            instance.phase4Rate(),
            instance.minCap(),
            instance.maxCap(),
            instance.symbol(),
            instance.name()
        ])

        assert.equal(owner, accounts[0], 'owner is not correctly set')
        assert.equal(target, config.target, 'target is not correctly set')
        assert.equal(phase1Date, config.phase1Date, 'phase1Date is not correctly set')
        assert.equal(phase2Date, config.phase2Date, 'phase2Date is not correctly set')
        assert.equal(phase3Date, config.phase3Date, 'phase3Date is not correctly set')
        assert.equal(phase4Date, config.phase4Date, 'phase4Date is not correctly set')
        assert.equal(endDate, config.endDate, 'endDate is not correctly set')
        assert.equal(phase1Rate, config.phase1Rate, 'phase1Rate is not correctly set')
        assert.equal(phase2Rate, config.phase2Rate, 'phase2Rate is not correctly set')
        assert.equal(phase3Rate, config.phase3Rate, 'phase3Rate is not correctly set')
        assert.equal(phase4Rate, config.phase4Rate, 'phase4Rate is not correctly set')
        assert.equal(minCap.toString(10), web3.toWei(config.minCap, 'ether'), 'minCap is not correctly set')
        assert.equal(maxCap.toString(10), web3.toWei(config.maxCap, 'ether'), 'maxCap is not correctly set')

        assert.equal(symbol, 'BFC', 'symbol is not correctly set')
        assert.equal(name, 'BlockFoodCoin', 'name is not correctly set')
    })

    const getNewInstance = async (config) => {
        return (await BlockFoodCoin.new(
            config.target,
            config.phase1Date,
            config.phase2Date,
            config.phase3Date,
            config.phase4Date,
            config.endDate,
            config.phase1Rate,
            config.phase2Rate,
            config.phase3Rate,
            config.phase4Rate,
            web3.toWei(config.minCap, 'ether'),
            web3.toWei(config.maxCap, 'ether'),
        ))
    }

    describe('buy', () => {

        const testFailure = async (phase1Date, endDate) => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = phase1Date
            configDuplicate.endDate = endDate

            const instance = await getNewInstance(configDuplicate)

            await expectFailure(
                instance.buy({ value: web3.toWei(1, 'ether') }),
                'buy did not throw an error'
            )
        }

        it('should work', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.endDate = getCurrentDate(100)

            const instance = await getNewInstance(configDuplicate)

            await instance.buy({ value: web3.toWei(1, 'ether') })

            // const { now, startDate, endDate} = logs[0].args
            // console.log(new Date(), [now, startDate, endDate].map(d => new Date(d.toNumber()*1000)))
        })

        it('should throw if before token sale', async () => {
            await testFailure(getCurrentDate(100), getCurrentDate(200))
        })

        it('should throw if after token sale', async () => {
            await testFailure(getCurrentDate(-100), getCurrentDate(-50))
        })

        it('should throw if max cap reached', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.endDate = getCurrentDate(100)
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            await instance.buy({ value: web3.toWei(4, 'ether') })

            await expectFailure(
                instance.buy({ value: web3.toWei(1, 'ether') }),
                'buy did not throw an error'
            )
        })

        const testPhase = async (name, config, etherAmountForEachOperation, numberOfOperation, expectedBFCAmount) => {
            const instance = await getNewInstance(config)

            const decimals = await instance.decimals()

            const events = []
            for (let i = 0; i < numberOfOperation; i++) {
                const { logs } = await instance.buy({ value: web3.toWei(etherAmountForEachOperation, 'ether') })
                events.push(logs)
            }

            const balance = await instance.balanceOf(accounts[0])

            assert.equal(balance, expectedBFCAmount * Math.pow(10, decimals.toNumber()), `During phase ${name}, did not get the right amount of BFC`)

            const totalSupply = await instance.totalSupply()

            assert.equal(totalSupply, expectedBFCAmount * Math.pow(10, decimals.toNumber()), `During phase ${name}, did not get the right total supply`)

            const totalDonated = await instance.historyOf(accounts[0])

            assert.equal(totalDonated, etherAmountForEachOperation * numberOfOperation * Math.pow(10, 18), `Did not store history`)

            assert.equal(events.length > 0, true, 'no events were generated')

            events.forEach(logs => logs.forEach(log => {
                assert.equal(log.event, 'Donation', 'event: name is wrong')
                assert.equal(log.args.account, accounts[0], 'event: account is wrong')
                assert.equal(
                    log.args.etherDonated,
                    etherAmountForEachOperation * Math.pow(10, 18),
                    'event: etherDonated is wrong'
                )
                assert.equal(
                    log.args.blockFoodCoins,
                    Math.pow(10, decimals.toNumber()) * expectedBFCAmount / numberOfOperation,
                    'event: blockFoodCoins is wrong'
                )

            }))
        }

        it('should give the right amount of BFC during phase 1', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(100)
            configDuplicate.phase3Date = getCurrentDate(200)
            configDuplicate.phase4Date = getCurrentDate(300)
            configDuplicate.endDate = getCurrentDate(400)
            configDuplicate.phase1Rate = 1200

            await testPhase('Phase1', configDuplicate, 1, 1, 1200)
            await testPhase('Phase1', configDuplicate, 2, 1, 2400)
            await testPhase('Phase1', configDuplicate, 1, 2, 2400)
        })

        it('should give the right amount of BFC during phase 2', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(200)
            configDuplicate.phase4Date = getCurrentDate(300)
            configDuplicate.endDate = getCurrentDate(400)
            configDuplicate.phase2Rate = 1100

            await testPhase('Phase2', configDuplicate, 1, 1, 1100)
            await testPhase('Phase2', configDuplicate, 2, 1, 2200)
            await testPhase('Phase2', configDuplicate, 1, 2, 2200)
        })

        it('should give the right amount of BFC during phase 3', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-25)
            configDuplicate.phase4Date = getCurrentDate(300)
            configDuplicate.endDate = getCurrentDate(400)
            configDuplicate.phase3Rate = 1050

            await testPhase('Phase3', configDuplicate, 1, 1, 1050)
            await testPhase('Phase3', configDuplicate, 2, 1, 2100)
            await testPhase('Phase3', configDuplicate, 1, 2, 2100)
        })

        it('should give the right amount of BFC during phase 4', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(400)
            configDuplicate.phase4Rate = 1000

            await testPhase('Phase4', configDuplicate, 1, 1, 1000)
            await testPhase('Phase4', configDuplicate, 2, 1, 2000)
            await testPhase('Phase4', configDuplicate, 1, 2, 2000)
        })
    })

    describe('finalize', () => {
        const getFinalizableInstance = async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 0
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(-20)

            return await getNewInstance(configDuplicate)
        }
        it('should not be able to be called twice', async () => {
            const instance = await getFinalizableInstance()

            await instance.finalize()

            await expectFailure(instance.finalize(), `Was able to finalize twice`)
        })
        it('should be callable only by the owner of the smart contract', async () => {
            const instance = await getFinalizableInstance()

            await expectFailure(
                instance.finalize({ from: accounts[1] }),
                `a non-owner account was able to finalize the contract`
            )
        })
        it('should throw if endDate is not reached', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 0
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(20)

            const instance = await getNewInstance(configDuplicate)

            await expectFailure(
                instance.finalize(),
                `Was able to finalize while the token sale was in progress`
            )
        })
        it('should work if endDate or maxCap is reached and not set isCancelled to true', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 0
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(20)
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            await instance.buy({ value: web3.toWei(4, 'ether') })

            await instance.finalize()

            const isCancelled = await instance.isCancelled()

            assert.equal(isCancelled, false, `finalize set isCancelled to true`)
        })
        it('should transfer the funds to target if endDate or maxCap is reached', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 0
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(20)
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            const balanceBefore = await getBalance(configDuplicate.target)

            await instance.buy({ value: web3.toWei(4, 'ether') })

            await instance.finalize()

            const balanceAfter = await getBalance(configDuplicate.target)

            assert.equal(balanceBefore.plus(web3.toWei(4, 'ether')).toNumber(), balanceAfter.toNumber(), `finalize did not send the funds to target`)
        })
        it('should mint the right amount of bfc for the OSE foundation', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 0
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(20)
            configDuplicate.phase4Rate = 1000
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            const decimals = await instance.decimals()

            await instance.buy({ value: web3.toWei(4, 'ether') })

            await instance.finalize()

            const balanceOfOSE = await instance.balanceOf(configDuplicate.target)

            assert.equal(
                (balanceOfOSE.toNumber() / Math.pow(10, decimals.toNumber())).toPrecision(10),
                ((4000 * (10 / 7) - 4000)).toPrecision(10),
                'target did not receive the right amount of BFC'
            )
        })
        it('should set isCancelled to true if minCap not reached and not transfer ethereums to target', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 2
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(-20)
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            const balanceBefore = await getBalance(configDuplicate.target)

            await instance.donate({ value: 1000000 })

            await instance.finalize()

            const isCancelled = await instance.isCancelled()

            assert.equal(
                isCancelled,
                true,
                'finalize did not set isCancelled to true'
            )

            const balanceAfter = await getBalance(configDuplicate.target)

            assert.equal(balanceBefore.toNumber(), balanceAfter.toNumber(), `finalize send the funds to target despite failure`)
        })
    })

    describe('refund', () => {
        it('should throw if not cancelled', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 2
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(20)
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            await instance.buy({ value: web3.toWei(4, 'ether') })

            await instance.finalize()

            await expectFailure(
                instance.refund(),
                'refund did not fail'
            )
        })
        it('should send the ether back if cancelled', async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 3
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(10)
            configDuplicate.maxCap = 4

            const instance = await getNewInstance(configDuplicate)

            await instance.buy({ value: web3.toWei(1, 'ether') })

            await instance.buy({ value: web3.toWei(1, 'ether'), from: accounts[1] })

            web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [15], id: 0 })
            console.log('WARNING FOR FURTHER TEST, TIME IS NOW 15 SECONDS LATER')
            timeAdjustement += 15

            await instance.finalize()

            assert.equal(await instance.isCancelled(), true, `token sale is not cancelled`)

            const balanceBefore = await getBalance(accounts[0])

            const firstRefund = await instance.refund()
            const secondRefund = await instance.refund()

            const balanceAfter = await getBalance(accounts[0])

            const gasUsed =
                firstRefund.receipt.cumulativeGasUsed * Math.pow(10, 11) +
                secondRefund.receipt.cumulativeGasUsed * Math.pow(10, 11)

            assert.equal(
                balanceBefore.plus(web3.toWei(1, 'ether')).toNumber(),
                balanceAfter.plus(gasUsed).toNumber(),
                `did not get a refund`
            )

            const event = firstRefund.logs[0]

            assert.equal(event.event, 'Refund', `bad event name`)
            assert.equal(event.args.account, accounts[0], `bad account`)
            assert.equal(event.args.etherRefunded, web3.toWei(1, 'ether'), `bad amount`)

            assert.equal(secondRefund.logs.length, 0, `second refund triggered an event`)
        })
    })

    describe('erc20 token capabilities', () => {
        const getFinalizedInstance = async () => {
            const configDuplicate = Object.assign({}, config)
            configDuplicate.minCap = 0
            configDuplicate.phase1Date = getCurrentDate(-100)
            configDuplicate.phase2Date = getCurrentDate(-50)
            configDuplicate.phase3Date = getCurrentDate(-40)
            configDuplicate.phase4Date = getCurrentDate(-30)
            configDuplicate.endDate = getCurrentDate(10)
            configDuplicate.phase4Rate = 1000
            configDuplicate.maxCap = 0.1

            const instance = await getNewInstance(configDuplicate)

            await instance.buy({ value: web3.toWei(0.1, 'ether'), from: accounts[2] })

            await instance.finalize()

            return instance
        }

        const checkBalance = async (instance, account, expectedAmount) => {
            assert.equal(
                (await instance.balanceOf(account)).toNumber(),
                expectedAmount * Math.pow(10, 18),
                `did not get proper balance for account ${account}`
            )
        }
        describe('balanceOf', () => {
            it('should return the balance of the account', async () => {
                const instance = await getFinalizedInstance()

                await checkBalance(instance, accounts[2], 100)
                await checkBalance(instance, accounts[3], 0)
            })
        })

        describe('totalSupply', () => {
            it('should return the total supply generated by the token sale', async () => {
                const instance = await getFinalizedInstance()

                assert.equal((await instance.totalSupply()).toNumber(), (100 * 10 / 7) * Math.pow(10, 18), `wrong total supply`)
            })
        })

        describe('transfer', () => {
            it('should transfer BFC from sender to target ', async () => {
                const instance = await getFinalizedInstance()

                await checkBalance(instance, accounts[2], 100)
                await checkBalance(instance, accounts[3], 0)

                await instance.transfer(accounts[3], web3.toWei(100, 'ether'), { from: accounts[2] })

                await checkBalance(instance, accounts[2], 0)
                await checkBalance(instance, accounts[3], 100)
            })
            it('should transfer BFC from sender to target only if amount available', async () => {
                const instance = await getFinalizedInstance()

                await checkBalance(instance, accounts[2], 100)
                await checkBalance(instance, accounts[3], 0)

                await instance.transfer(accounts[3], web3.toWei(1000, 'ether'), { from: accounts[2] })

                await checkBalance(instance, accounts[2], 100)
                await checkBalance(instance, accounts[3], 0)
            })
            it('should send Transfer event', async () => {
                const instance = await getFinalizedInstance()

                const { logs } = await instance.transfer(accounts[3], web3.toWei(100, 'ether'), { from: accounts[2] })

                assert.equal(logs[0].event, 'Transfer')
                assert.equal(logs[0].args._from, accounts[2], `_from was not set correctly`)
                assert.equal(logs[0].args._to, accounts[3], `_to was not set correctly`)
                assert.equal(logs[0].args._value, web3.toWei(100, 'ether'), `_value was not set correctly`)
            })
        })
        describe('approve', () => {
            it('should approve spending and send an Approval event', async () => {
                const instance = await getFinalizedInstance()

                const { logs } = await instance.approve(accounts[3], web3.toWei(100, 'ether'), { from: accounts[2] })

                assert.equal(logs[0].event, 'Approval')
                assert.equal(logs[0].args._owner, accounts[2], `_from was not set correctly`)
                assert.equal(logs[0].args._spender, accounts[3], `_to was not set correctly`)
                assert.equal(logs[0].args._value, web3.toWei(100, 'ether'), `_value was not set correctly`)

                const allowance = await instance.allowance(accounts[2], accounts[3])

                assert.equal(allowance, web3.toWei(100, 'ether'), `allowance was not correct`)
            })
        })

        describe('transferFrom', () => {
            it('should actually transfer approved transaction', async () => {
                const instance = await getFinalizedInstance()

                const { logs } = await instance.approve(accounts[3], web3.toWei(100, 'ether'), { from: accounts[2] })

                await instance.transferFrom(accounts[2], accounts[4], web3.toWei(100, 'ether'), { from: accounts[3] })

                await checkBalance(instance, accounts[2], 0)
                await checkBalance(instance, accounts[4], 100)
            })
            it('should do nothing if transaction not approved', async () => {
                const instance = await getFinalizedInstance()

                await instance.transferFrom(accounts[2], accounts[4], web3.toWei(100, 'ether'), { from: accounts[3] })

                await checkBalance(instance, accounts[2], 100)
                await checkBalance(instance, accounts[4], 0)
            })
        })

    })
})