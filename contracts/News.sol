// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// 新闻管理合约，支持多个同时激活的新闻，包含标题、类型和 Walrus 存储的内容
contract News is Ownable, Pausable {
    // 定义新闻的结构体，存储新闻信息
    struct NewsItem {
        // 新闻标题
        string title;
        // 新闻类型（如：突发新闻、专题报道、评论）
        string newsType;
        // 每小时费用（单位：USD）
        uint256 hourlyRate;
        // 新闻展示时长（单位：小时）
        uint256 durationHours;
        // 新闻到期时间戳（单位：秒）
        uint256 expiryTimestamp;
        // 发布者地址
        address publisher;
        // 新闻内容的 Walrus Blob ID
        string walrusBlobId;
        // 发布总费用
        uint256 totalBid;
        // 新闻是否激活
        bool isActive;
    }

    // 状态变量
    // 新闻映射，键为新闻 ID，值为 NewsItem 结构体
    mapping(uint256 => NewsItem) public newsItems;
    // 新闻计数器，记录已创建的新闻数量
    uint256 public newsCount;
    // 合约累积的总收入（单位：wei）
    uint256 public totalRevenue;
    // 每个发布者的总花费（单位：wei）
    mapping(address => uint256) public publisherTotalSpent;
    // 基础每小时费用（单位：USD），不可低于此值，默认为 1 USD
    uint256 public baseHourlyRate = 1;
    // ETH/USDT 汇率（wei per USDT，由管理员设置）
    uint256 public ethPerUsdt;
    // 最小展示时长（1小时）
    uint256 public constant MIN_DURATION_HOURS = 1;

    // 事件定义
    // 新闻发布时触发的事件
    event NewsPublished(
        uint256 indexed newsId,
        address indexed publisher,
        string title,
        string newsType,
        uint256 hourlyRate,
        uint256 durationHours,
        string walrusBlobId,
        uint256 totalBid,
        uint256 expiryTimestamp
    );

    // 新闻到期时触发的事件
    event NewsExpired(
        uint256 indexed newsId,
        address indexed publisher,
        uint256 revenue,
        uint256 timestamp
    );

    // 收入提取时触发的事件
    event RevenueWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    // 构造函数，初始化合约拥有者和基础费用
    constructor() Ownable(msg.sender) {
        // 初始化 ETH/USDT 汇率（假设 1 ETH = 2000 USDT，可由管理员调整）
        ethPerUsdt = 1 ether / 2000;
    }

    // 发布新闻，包含标题、类型和 Walrus 存储的内容
    function publishNews(
        string memory title,
        string memory newsType,
        uint256 hourlyRate,
        uint256 durationHours,
        string memory walrusBlobId
    ) external payable whenNotPaused {
        // 验证输入
        require(durationHours >= MIN_DURATION_HOURS, "Duration too short");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(newsType).length > 0, "News type cannot be empty");
        require(bytes(walrusBlobId).length > 0, "Invalid Walrus Blob ID");

        // 如果未提供费用或为 0，则使用基础费用
        uint256 fee = hourlyRate == 0 ? baseHourlyRate : hourlyRate;
        require(fee >= baseHourlyRate, "Hourly rate below base value");

        // 计算总费用
        uint256 totalBid = fee * ethPerUsdt * durationHours;
        require(msg.value >= totalBid, "Insufficient payment");

        // 递增新闻计数器
        newsCount++;

        // 创建并激活新新闻
        newsItems[newsCount] = NewsItem({
            title: title,
            newsType: newsType,
            hourlyRate: fee,
            durationHours: durationHours,
            expiryTimestamp: block.timestamp + (durationHours * 1 hours),
            publisher: msg.sender,
            walrusBlobId: walrusBlobId,
            totalBid: totalBid,
            isActive: true
        });

        // 更新总收入和发布者花费
        totalRevenue += totalBid;
        publisherTotalSpent[msg.sender] += totalBid;

        // 如果有多余支付，退款
        if (msg.value > totalBid) {
            (bool success, ) = msg.sender.call{value: msg.value - totalBid}("");
            require(success, "Refund failed");
        }

        emit NewsPublished(
            newsCount,
            msg.sender,
            title,
            newsType,
            fee,
            durationHours,
            walrusBlobId,
            totalBid,
            block.timestamp + (durationHours * 1 hours)
        );
    }

    // 检查新闻是否到期并更新状态
    function checkNewsExpiry(uint256 newsId) external {
        require(newsId <= newsCount, "Invalid news ID");
        NewsItem storage news = newsItems[newsId];
        require(
            news.isActive && block.timestamp >= news.expiryTimestamp,
            "News not expired yet"
        );

        _expireNews(newsId);
    }

    // 提取合约收入，仅限拥有者调用
    function withdrawRevenue() external onlyOwner {
        uint256 amount = totalRevenue;
        require(amount > 0, "No revenue to withdraw");
        totalRevenue = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit RevenueWithdrawn(msg.sender, amount, block.timestamp);
    }

    // 暂停合约，仅限拥有者调用
    function pause() external onlyOwner {
        _pause();
    }

    // 取消暂停合约，仅限拥有者调用
    function unpause() external onlyOwner {
        _unpause();
    }

    // 内部函数：清理到期新闻
    function _expireNews(uint256 newsId) internal {
        NewsItem storage news = newsItems[newsId];
        address previousPublisher = news.publisher;

        // 重置新闻状态
        news.isActive = false;
        news.publisher = address(0);
        news.walrusBlobId = "";
        news.totalBid = 0;
        news.expiryTimestamp = 0;

        emit NewsExpired(
            newsId,
            previousPublisher,
            totalRevenue,
            block.timestamp
        );
    }

    // 手动让新闻到期，仅限拥有者调用
    function expireNews(uint256 newsId) external onlyOwner {
        require(newsId <= newsCount, "Invalid news ID");
        NewsItem storage news = newsItems[newsId];
        address previousPublisher = news.publisher;

        // 重置新闻状态
        news.isActive = false;
        news.publisher = address(0);
        news.walrusBlobId = "";
        news.totalBid = 0;
        news.expiryTimestamp = 0;

        emit NewsExpired(
            newsId,
            previousPublisher,
            totalRevenue,
            block.timestamp
        );
    }

    // 设置基础每小时费用，仅限拥有者调用
    function setBaseHourlyRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Base rate must be positive");
        baseHourlyRate = newRate;
    }

    // 设置 ETH/USDT 汇率，仅限拥有者调用
    function setEthPerUsdt(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be positive");
        ethPerUsdt = newRate;
    }
}
