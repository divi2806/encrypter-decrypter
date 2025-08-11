# File Encryption & Walrus Storage

A decentralized file encryption and storage solution that allows secure file sharing through allowlisted wallets using Walrus storage network.

## Features

- **Multi-format Support**: Upload and encrypt PDF, DOCX, images, and other file formats
- **Allowlist Management**: Control access through wallet-based allowlists
- **Walrus Integration**: Decentralized storage using Walrus network
- **Secure Encryption**: Files are encrypted before storage using Seal encryption
- **Easy Sharing**: Generate shareable links for authorized decryption and download

## How to Use

### 1. Setup and Launch

Launch the encrypter application.

### 2. Create Allowlist

Create an allowlist for authorized wallets. The gas fees are pre-sponsored using the admin's private key on testnet.

### 3. Add Authorized Wallets

Add wallet addresses to your allowlist to control who can access encrypted files.

### 4. Configure Aggregator

Change the aggregator setting to **nodes.guru** (verified working aggregator).

### 5. Upload and Encrypt Files

1. Upload any supported file format (PDF, DOCX, images, etc.)
2. Click **"Encrypt the file to Walrus"**
3. The Seal will encrypt your file and upload the encrypted version to Walrus storage

### 6. Associate Object ID

After encryption, associate the generated object ID to link decryption keys with your allowlist wallets.

### 7. Share Access

Click on the link at the top of the interface to generate a shareable URL for decrypting and downloading the files. Only wallets in your allowlist will be able to access the decrypted content.

## Workflow Summary

```
Upload File → Configure Allowlist → Set Aggregator (nodes.guru) → Encrypt to Walrus → Associate Object ID → Share Access Link
```

## Supported File Formats

- PDF documents
- DOCX files
- Images (various formats)
- Other file types

## Network

Currently configured for **testnet** with sponsored gas fees.

## Security Features

- Wallet-based access control
- End-to-end encryption using Seal
- Decentralized storage on Walrus network
- Allowlist-only decryption access

## Getting Started

1. Clone this repository
2. Install dependencies
3. Launch the application (pnpm install, pnpm run dev)

