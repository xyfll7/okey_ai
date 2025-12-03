# Multi-Model API System

This module provides a unified interface for interacting with multiple Large Language Models (LLM) including Qwen, DeepSeek, OpenAI, and others.

## Features

- Support for multiple LLM providers (Qwen, DeepSeek, OpenAI)
- Dynamic model switching at runtime
- Unified API interface for consistent usage across different models
- Thread-safe implementation using Tauri's async runtime

## Architecture

The system consists of:

1. **Traits** (`traits.rs`): Defines the common interfaces and data structures
2. **Model Clients** (`qwen.rs`, `deepseek.rs`, `openai.rs`): Individual implementations for each model API
3. **Manager** (`manager.rs`): Central manager for handling multiple clients and model switching
4. **Commands** (`commands.rs`): Tauri commands for frontend interaction

## Usage

The system can be used from the frontend via Tauri commands:

1. Initialize the API manager with model configurations
2. Switch between different models as needed
3. Make chat completion requests using the unified interface

## Supported Models

- **Qwen**: Alibaba's Qwen model API
- **DeepSeek**: DeepSeek API
- **OpenAI**: OpenAI-compatible API
- **Custom**: Can be extended to support additional models

Each model client handles API-specific request/response formatting and converts to a unified format.