const BlockFoodToken = artifacts.require('./BlockFoodToken.sol')

const config = require('../token-sale/config')

module.exports = function (deployer) {
    console.log(deployer)
    console.log('Deploy BlockFoodToken', config)
    deployer.deploy(BlockFoodToken,
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
    )
}
