// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./UserProfile.sol";
import "./TokenLaunch.sol";
import "./HKNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Space is Ownable {
    // 空间类型枚举：文字、图片、视频
    enum SpaceType {
        Text,
        Image,
        Video
    }

    // 评论结构体
    struct Comment {
        address author; // 评论作者
        string walrusBlobId; // Walrus 存储的评论 Blob ID
    }

    // 空间结构体
    struct SpaceItem {
        address creator; // 空间创建者
        SpaceType spaceType; // 空间类型
        string title; // 空间标题
        string walrusBlobId; // Walrus 存储的空间元数据 Blob ID
        uint256 likes; // 点赞数
        Comment[] comments; // 评论数组
        uint256 heat; // 热度值
        string name; // 代币名称
        string symbol; // 代币符号
    }

    // 空间映射：空间 ID 到空间详情
    mapping(uint256 => SpaceItem) public spaces;
    // 空间计数器
    uint256 public spaceCount;
    // 用户资料合约实例
    UserProfile public userProfile;
    // 代币发射合约实例
    TokenLaunch public tokenLaunch;
    // HK NFT 合约实例
    HKNFT public hkNFT;
    // ETH/USDT 汇率（wei per USDT）
    uint256 public ethPerUsdt;
    // 发币热度值
    uint256 public heatValue;
    // 用户总消费（wei）
    mapping(address => uint256) public userTotalSpent;
    // 用户在特定空间上的消费（wei）
    mapping(uint256 => mapping(address => uint256)) public userSpaceSpent;
    // 合约总收入（wei）
    uint256 public totalRevenue;
    // 每条空间的收入（wei）
    mapping(uint256 => uint256) public spaceRevenue;
    // 空间参与者映射：空间 ID -> 参与者地址 -> 是否参与
    mapping(uint256 => mapping(address => bool)) public spaceParticipants;
    // 空间参与者列表：空间 ID -> 参与者地址数组
    mapping(uint256 => address[]) public spaceParticipantList;
    // 空间对应的代币地址
    mapping(uint256 => address) public spaceToToken;

    // 收费标准（USDT）
    uint256 public constant CREATE_FEE_USDT = 5; // 创建空间：5 USDT
    uint256 public constant CREATE_VIDEO_FEE_USDT = 10; // 创建视频空间：10 USDT
    uint256 public constant LIKE_FEE_USDT = 1; // 点赞：1 USDT
    uint256 public constant COMMENT_FEE_USDT = 2; // 评论：2 USDT
    // 流动性池 ETH 数量
    uint256 public constant LIQUIDITY_ETH_AMOUNT = 10 ether;

    // 事件：空间创建
    event SpaceCreated(
        uint256 indexed spaceId,
        address indexed creator,
        SpaceType spaceType,
        string title,
        string walrusBlobId,
        uint256 timestamp
    );
    // 事件：空间被点赞
    event Liked(
        uint256 indexed spaceId,
        address indexed user,
        uint256 newLikes,
        uint256 newHeat,
        uint256 fee,
        uint256 timestamp
    );
    // 事件：空间被评论
    event Commented(
        uint256 indexed spaceId,
        address indexed user,
        string walrusBlobId,
        uint256 newHeat,
        uint256 fee,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {
        // 初始化 ETH/USDT 汇率：1 ETH = 2000 USDT
        ethPerUsdt = 1 ether / 2000;
        uint256 ethPriceInUsd = 2000; // 假设 ETH 价格为 2000 USD
        uint256 usdtRequired = LIQUIDITY_ETH_AMOUNT * ethPriceInUsd; // 计算所需 USDT
        uint256 usdtPerHeat = 1; // 每热度对应 1 USDT
        heatValue = usdtRequired / usdtPerHeat;
    }

    function setUserProfile(address user) external onlyOwner {
        require(user != address(0), "Invalid UserProfile address");
        userProfile = UserProfile(user);
    }

    function setTokenLaunch(address _tokenLaunch) external onlyOwner {
        tokenLaunch = TokenLaunch(payable(_tokenLaunch));
    }

    function setHKNFT(address _hkNFT) external onlyOwner {
        require(_hkNFT != address(0), "Invalid HKNFT contract address");
        hkNFT = HKNFT(_hkNFT);
    }

    // 创建空间，需支付费用
    function createSpace(
        SpaceType spaceType,
        string memory title,
        string memory walrusBlobId,
        string memory name,
        string memory symbol
    ) external payable returns (uint256) {
        // 确保用户已创建资料
        (, , , , , , bool initialized) = userProfile.users(msg.sender);
        require(initialized, "Profile not created");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(walrusBlobId).length > 0, "Invalid Walrus Blob ID");

        uint256 fee;
        if (spaceType == SpaceType.Video) {
            fee = CREATE_VIDEO_FEE_USDT * ethPerUsdt;
        } else {
            fee = CREATE_FEE_USDT * ethPerUsdt;
        }
        require(msg.value >= fee, "Insufficient payment for creation");

        spaceCount++;
        SpaceItem storage space = spaces[spaceCount];
        space.creator = msg.sender;
        space.spaceType = spaceType;
        space.title = title;
        space.walrusBlobId = walrusBlobId;
        space.name = name;
        space.symbol = symbol;
        space.heat += fee / ethPerUsdt;

        spaceParticipants[spaceCount][msg.sender] = true;
        spaceParticipantList[spaceCount].push(msg.sender);

        userTotalSpent[msg.sender] += fee;
        userSpaceSpent[spaceCount][msg.sender] += fee;
        spaceRevenue[spaceCount] += fee;
        totalRevenue += fee;

        userProfile.addSpace(msg.sender, spaceCount);
        emit SpaceCreated(
            spaceCount,
            msg.sender,
            spaceType,
            title,
            walrusBlobId,
            block.timestamp
        );

        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
        return spaceCount;
    }

    // 点赞空间，需支付费用
    function like(uint256 spaceId) external payable {
        require(spaceId <= spaceCount, "Space not found");
        uint256 fee = LIKE_FEE_USDT * ethPerUsdt;

        SpaceItem storage space = spaces[spaceId];
        _handleInteraction(spaceId, space, fee);

        space.likes++;
        emit Liked(
            spaceId,
            msg.sender,
            space.likes,
            space.heat,
            fee,
            block.timestamp
        );
    }

    // 评论空间，需支付费用
    function comment(
        uint256 spaceId,
        string memory walrusBlobId
    ) external payable {
        require(spaceId <= spaceCount, "Space not found");
        uint256 fee = COMMENT_FEE_USDT * ethPerUsdt;
        SpaceItem storage space = spaces[spaceId];
        _handleInteraction(spaceId, space, fee);

        space.comments.push(
            Comment({author: msg.sender, walrusBlobId: walrusBlobId})
        );
        emit Commented(
            spaceId,
            msg.sender,
            walrusBlobId,
            space.heat,
            fee,
            block.timestamp
        );
    }

    // 内部函数：处理交互的公共逻辑
    function _handleInteraction(
        uint256 spaceId,
        SpaceItem storage space,
        uint256 fee
    ) internal {
        require(msg.value >= fee, "Insufficient payment");

        // 更新热度
        space.heat += fee / ethPerUsdt;

        // 记录参与者
        if (!spaceParticipants[spaceId][msg.sender]) {
            spaceParticipants[spaceId][msg.sender] = true;
            spaceParticipantList[spaceId].push(msg.sender);
        }

        // 更新消费记录
        userTotalSpent[msg.sender] += fee;
        userSpaceSpent[spaceId][msg.sender] += fee;
        spaceRevenue[spaceId] += fee;
        totalRevenue += fee;

        // 检查是否触发代币发射
        checkHeat(spaceId);

        // 退还多余支付
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }

    // 铸造 NFT，仅限空间拥有者且热度达到代币发射阈值
    function mintNFT(uint256 spaceId, string memory metadataUri) external {
        require(spaceId <= spaceCount, "Space not found");
        require(
            msg.sender == spaces[spaceId].creator,
            "Only space creator can mint NFT"
        );
        require(address(hkNFT) != address(0), "HKNFT contract not set");
        require(
            spaces[spaceId].heat >= heatValue,
            "Insufficient heat for NFT minting"
        );
        require(bytes(metadataUri).length > 0, "Invalid metadata URI");

        hkNFT.mintNFT(msg.sender, spaceId, metadataUri);
    }

    // 检查热度并触发代币发射
    function checkHeat(uint256 spaceId) internal {
        require(spaceId <= spaceCount, "Space not found");
        if (
            spaces[spaceId].heat >= heatValue &&
            spaceToToken[spaceId] == address(0) &&
            spaceRevenue[spaceId] >= LIQUIDITY_ETH_AMOUNT
        ) {
            // 转移 LIQUIDITY_ETH_AMOUNT 到 TokenLaunch 合约
            (bool success, ) = address(tokenLaunch).call{
                value: LIQUIDITY_ETH_AMOUNT
            }("");
            require(success, "ETH transfer to TokenLaunch failed");

            // 扣减空间收入和总收入
            spaceRevenue[spaceId] -= LIQUIDITY_ETH_AMOUNT;
            totalRevenue -= LIQUIDITY_ETH_AMOUNT;

            // 触发代币发射
            tokenLaunch.launchToken(
                spaceId,
                spaces[spaceId].creator,
                spaces[spaceId].name,
                spaces[spaceId].symbol
            );
            spaceToToken[spaceId] = tokenLaunch.tokens(spaceId);
        }
    }

    // 获取空间创建者
    function creator(uint256 spaceId) public view returns (address) {
        return spaces[spaceId].creator;
    }

    // 获取空间热度
    function heat(uint256 spaceId) public view returns (uint256) {
        return spaces[spaceId].heat;
    }

    // 设置 ETH/USDT 汇率，仅限拥有者
    function setEthPerUsdt(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be positive");
        ethPerUsdt = newRate;
        // 重新计算 heatValue
        uint256 ethPriceInUsd = 2000; // 假设 ETH 价格为 2000 USD
        uint256 usdtRequired = LIQUIDITY_ETH_AMOUNT * ethPriceInUsd;
        uint256 usdtPerHeat = 1;
        heatValue = usdtRequired / usdtPerHeat;
    }

    // 提取合约收入，仅限拥有者
    function withdrawRevenue() external onlyOwner {
        uint256 amount = totalRevenue;
        require(amount > 0, "No revenue to withdraw");
        require(address(this).balance >= amount, "Insufficient balance");
        totalRevenue = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    // 获取空间参与者列表
    function getSpaceParticipants(
        uint256 spaceId
    ) external view returns (address[] memory) {
        return spaceParticipantList[spaceId];
    }

    // 测试用：设置热度
    function setHeat(uint256 spaceId, uint256 newHeat) external onlyOwner {
        spaces[spaceId].heat = newHeat;
    }

    // 测试用：添加收入
    function addRevenue(
        uint256 spaceId,
        uint256 amount
    ) external payable onlyOwner {
        require(msg.value == amount, "Incorrect value");
        require(spaceId <= spaceCount, "Space not found");
        spaceRevenue[spaceId] += amount;
        totalRevenue += amount;
    }
}
