// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

// 用户资料管理合约，负责创建用户资料、记录空间和发放奖励
contract UserProfile is Ownable {
    // 定义用户资料的结构体，存储用户基本信息和空间记录
    struct User {
        string nickname; // 昵称
        string username; // 用户名
        string bio; // 个人简介
        string xName; // X 平台名称
        string tgName; // Telegram 名称
        string avatarBlobId; // 头像 Blob ID
        uint256[] createdSpaces; // 创建的空间 ID 列表
        bool initialized; // 是否已初始化资料
    }

    // 用户地址到用户资料的映射
    mapping(address => User) public users;

    address private space;

    // 事件定义
    // 用户资料创建时触发的事件
    event ProfileCreated(
        address indexed user,
        string nickname,
        string username,
        string bio,
        string xName,
        string tgName,
        string avatarBlobId,
        uint256 timestamp
    );

    // 用户添加空间时触发的事件
    event SpaceAdded(address indexed user, uint256 spaceId, uint256 timestamp);

    // 构造函数，初始化合约拥有者
    constructor() Ownable(msg.sender) {}

    // 创建用户个人信息，外部调用
    function createProfile(
        string memory nickname,
        string memory username,
        string memory bio,
        string memory xName,
        string memory tgName,
        string memory avatarBlobId
    ) external {
        // 检查用户是否已创建资料
        require(!users[msg.sender].initialized, "Profile already exists");
        // 检查昵称是否为空
        require(bytes(nickname).length > 0, "Nickname cannot be empty");
        // 检查头像 Blob ID 是否有效
        require(bytes(avatarBlobId).length > 0, "Invalid avatar Blob ID");

        // 创建并初始化用户资料
        users[msg.sender] = User({
            nickname: nickname,
            username: username,
            bio: bio,
            xName: xName,
            tgName: tgName,
            avatarBlobId: avatarBlobId,
            createdSpaces: new uint256[](0),
            initialized: true
        });

        // 触发用户资料创建事件
        emit ProfileCreated(
            msg.sender,
            nickname,
            username,
            bio,
            xName,
            tgName,
            avatarBlobId,
            block.timestamp
        );
    }

    // 添加用户创建的空间 ID，仅限 Space 合约调用
    function addSpace(address user, uint256 spaceId) external onlySpace {
        // 检查用户资料是否存在
        require(users[user].initialized, "Profile not found");
        // 将空间 ID 添加到用户的 createdSpaces 数组
        users[user].createdSpaces.push(spaceId);
        // 触发空间添加事件
        emit SpaceAdded(user, spaceId, block.timestamp);
    }

    // 设置 Space 合约地址，仅限拥有者调用
    function setSpace(address _space) external onlyOwner {
        space = _space;
    }

    /********* modifier  ************ */

    modifier onlySpace() {
        require(msg.sender == space, "Caller is not Space contract");
        _;
    }

    /********* modifier  ************ */
}
