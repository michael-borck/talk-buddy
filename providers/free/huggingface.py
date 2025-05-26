"""
Hugging Face Inference API provider for Language Model
"""
import aiohttp
import json
from typing import AsyncIterator, Optional
from ..base import LLMProvider, ConversationMessage

class HuggingFaceLLMProvider(LLMProvider):
    """
    Hugging Face Inference API provider for conversational AI
    Uses the free inference API for text generation
    """
    
    def __init__(self, model_name: str = "microsoft/DialoGPT-medium"):
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/models/{model_name}"
        self._name = f"Hugging Face ({model_name})"
    
    async def generate_response(
        self, 
        messages: list[ConversationMessage],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncIterator[str]:
        """Generate streaming response using HuggingFace API"""
        
        # Convert messages to conversation format
        conversation_text = self._format_conversation(messages, system_prompt)
        
        payload = {
            "inputs": conversation_text,
            "parameters": {
                "max_new_tokens": kwargs.get("max_tokens", 150),
                "temperature": kwargs.get("temperature", 0.7),
                "return_full_text": False,
                "do_sample": True
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Handle response format
                        if isinstance(result, list) and len(result) > 0:
                            generated_text = result[0].get("generated_text", "")
                        else:
                            generated_text = result.get("generated_text", "")
                        
                        # Clean up the response
                        generated_text = self._clean_response(generated_text)
                        
                        # Simulate streaming by yielding chunks
                        words = generated_text.split()
                        for i, word in enumerate(words):
                            if i == len(words) - 1:
                                yield word
                            else:
                                yield word + " "
                    else:
                        # Fallback response for API errors
                        fallback = "I apologize, but I'm having trouble generating a response right now. Could you please rephrase your question?"
                        for word in fallback.split():
                            yield word + " "
                            
        except Exception as e:
            # Fallback response for connection errors
            fallback = "I'm sorry, I'm experiencing technical difficulties. Please try again."
            for word in fallback.split():
                yield word + " "
    
    def _format_conversation(self, messages: list[ConversationMessage], system_prompt: Optional[str]) -> str:
        """Format conversation for HuggingFace model"""
        formatted = ""
        
        if system_prompt:
            formatted += f"System: {system_prompt}\n\n"
        
        for message in messages[-5:]:  # Use last 5 messages for context
            if message.role == "user":
                formatted += f"Human: {message.content}\n"
            else:
                formatted += f"Assistant: {message.content}\n"
        
        formatted += "Assistant: "
        return formatted
    
    def _clean_response(self, text: str) -> str:
        """Clean up the generated response"""
        # Remove common artifacts
        text = text.strip()
        
        # Remove potential repetition or cut-off
        sentences = text.split('.')
        if len(sentences) > 1 and sentences[-1].strip() == "":
            text = '.'.join(sentences[:-1]) + '.'
        
        return text
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def is_available(self) -> bool:
        """HuggingFace free API is generally available"""
        return True