// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Token.sol";
import "./uniswap-v2/interfaces/IUniswapV2Factory.sol";
import "./uniswap-v2/interfaces/IUniswapV2Router01.sol";
import "./uniswap-v2/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Space.sol";
import "./HKNFT.sol";

contract TokenLaunch is Ownable {
    // 总代币供应量：10亿代币（带18位小数）
    uint256 public constant MAX_SUPPLY = 10 ** 9 * 10 ** 18;
    // 分配给参与者的代币：1/5，总计2亿代币
    uint256 public constant PARTICIPANT_SUPPLY = MAX_SUPPLY / 5;
    // 空间拥有者固定分配：10%代币的20%，即2000万代币
    uint256 public constant OWNER_ALLOCATION = 20_000_000 * 10 ** 18;
    // 剩余参与者分配：1.8亿代币
    uint256 public constant PARTICIPANT_DISTRIBUTION =
        PARTICIPANT_SUPPLY - OWNER_ALLOCATION;
    // 用于流动性池的代币：4/5，总计8亿代币
    uint256 public constant LIQUIDITY_SUPPLY = (MAX_SUPPLY * 4) / 5;

    // EDU Chain 测试网的 Uniswap V2 工厂和路由器地址
    address public constant UNISWAP_V2_FACTORY =
        0xf083C1EaEB852729E41981D4912aFE9BfF68C345;
    address public constant UNISWAP_V2_ROUTER =
        0xABd8913F5fA02FA539c319DDB8837A25eFD99cB9;

    // 空间 ID 到代币地址的映射
    mapping(uint256 => address) public tokens;
    // 空间合约实例
    Space public space;
    // HKNFT 合约实例
    HKNFT public nft;

    // 事件：代币发射
    event TokenLaunched(
        uint256 indexed spaceId,
        address indexed tokenAddress,
        address indexed creator,
        uint256 timestamp
    );
    // 事件：代币分配给参与者
    event TokensDistributed(
        uint256 indexed spaceId,
        address indexed tokenAddress,
        address indexed participant,
        uint256 amount,
        uint256 timestamp
    );
    // 事件：添加流动性
    event LiquidityAdded(
        address indexed tokenAddress,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 liquidity,
        uint256 timestamp
    );
    // 事件：收集手续费
    event FeeCollected(address indexed pair, uint256 amount, uint256 timestamp);

    modifier onlySpace() {
        require(msg.sender == address(space), "Only Space contract");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setSpace(address _space) external onlyOwner {
        require(_space != address(0), "Invalid Space contract address");
        space = Space(_space);
    }

    function setNFT(address _nft) external onlyOwner {
        require(_nft != address(0), "Invalid HKNFT contract address");
        nft = HKNFT(_nft);
    }

    function launchToken(
        uint256 spaceId,
        address creator,
        string memory name,
        string memory symbol
    ) external payable onlySpace {
        require(tokens[spaceId] == address(0), "Token already launched");
        require(msg.value > 0, "No ETH received for liquidity");

        // 创建新代币
        Token token = new Token(name, symbol, 0);
        tokens[spaceId] = address(token);

        // 分配代币给参与者
        distributeParticipantTokens(spaceId, address(token));
        // 添加流动性
        addLiquidity(address(token), msg.value);
        emit TokenLaunched(spaceId, address(token), creator, block.timestamp);
    }

    function distributeParticipantTokens(
        uint256 spaceId,
        address tokenAddress
    ) internal {
        uint256 totalSpent = space.spaceRevenue(spaceId);
        if (totalSpent == 0) return;

        Token token = Token(tokenAddress);
        address owner = space.creator(spaceId);
        if (owner != address(0)) {
            token.mint(owner, OWNER_ALLOCATION);
            emit TokensDistributed(
                spaceId,
                tokenAddress,
                owner,
                OWNER_ALLOCATION,
                block.timestamp
            );
        }

        address[] memory participants = space.getSpaceParticipants(spaceId);
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 spent = space.userSpaceSpent(spaceId, participant);
            if (spent == 0) continue;

            uint256 share = (PARTICIPANT_DISTRIBUTION * spent) / totalSpent;
            if (share > 0) {
                token.mint(participant, share);
                emit TokensDistributed(
                    spaceId,
                    tokenAddress,
                    participant,
                    share,
                    block.timestamp
                );
            }
        }
    }

    function addLiquidity(
        address tokenAddress,
        uint256 ethAmount
    ) internal returns (address) {
        Token token = Token(tokenAddress);
        IUniswapV2Router01 router = IUniswapV2Router01(UNISWAP_V2_ROUTER);

        token.mint(address(this), LIQUIDITY_SUPPLY);
        token.approve(UNISWAP_V2_ROUTER, LIQUIDITY_SUPPLY);

        IUniswapV2Factory factory = IUniswapV2Factory(UNISWAP_V2_FACTORY);
        address pair = factory.getPair(tokenAddress, router.WETH());
        if (pair == address(0)) {
            pair = factory.createPair(tokenAddress, router.WETH());
        }

        (, , uint256 liquidity) = router.addLiquidityETH{value: ethAmount}(
            tokenAddress,
            LIQUIDITY_SUPPLY,
            LIQUIDITY_SUPPLY / 2,
            ethAmount / 2,
            address(this),
            block.timestamp
        );

        emit LiquidityAdded(
            tokenAddress,
            LIQUIDITY_SUPPLY,
            ethAmount,
            liquidity,
            block.timestamp
        );
        return pair;
    }

    function collectFees(address pair) external onlyOwner {
        IUniswapV2Pair pairContract = IUniswapV2Pair(pair);
        uint256 balance = pairContract.balanceOf(address(this));
        if (balance > 0) {
            pairContract.transfer(address(this), balance);
            emit FeeCollected(pair, balance, block.timestamp);
        }
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}
