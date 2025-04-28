// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Space.sol";

// HK NFT 合约，负责为空间创作者铸造 NFT
contract HKNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter; // NFT 的 tokenId 计数器
    Space public space; // 空间合约实例

    // 事件：NFT 铸造
    event NFTMinted(
        uint256 indexed spaceId, // 空间 ID
        address indexed creator, // 创作者地址
        uint256 tokenId, // NFT 的 tokenId
        string metadataUri, // NFT 元数据 URI
        uint256 timestamp // 时间戳
    );

    // 构造函数，初始化 NFT 名称、符号和空间合约地址
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _tokenIdCounter = 0; // 初始化计数器
    }

    // 为指定创作者铸造 NFT，仅限空间合约调用
    // 参数：creator - 创作者地址，spaceId - 空间 ID，metadataUri - NFT 元数据 URI
    // 返回：铸造的 NFT 的 tokenId
    function mintNFT(
        address creator,
        uint256 spaceId,
        string memory metadataUri
    ) external returns (uint256) {
        require(msg.sender == address(space), "Only Space contract");
        require(creator != address(0), "Invalid creator address");
        require(bytes(metadataUri).length > 0, "Invalid metadata URI");

        uint256 tokenId = _tokenIdCounter; // 获取当前 tokenId
        _tokenIdCounter++; // 计数器加一
        _safeMint(creator, tokenId); // 安全铸造 NFT 给创作者
        _setTokenURI(tokenId, metadataUri); // 设置 NFT 的元数据 URI

        emit NFTMinted(spaceId, creator, tokenId, metadataUri, block.timestamp); // 触发铸造事件
        return tokenId;
    }

    // 获取 NFT 的元数据 URI，覆写父合约
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // 检查是否支持特定接口，覆写父合约
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // 设置空间合约地址，仅限拥有者调用
    function setSpaceContract(address _space) external onlyOwner {
        require(_space != address(0), "Invalid Space contract address");
        space = Space(_space);
    }
}
