import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Fab,
  List,
  ListItem,
  Avatar,
  Button,
  Tooltip,
} from '@mui/material';
import { MessageCircle, Send, X, Image as ImageIcon, Bot, User } from 'lucide-react';
import ChatbotService, { type ChatMessage } from '../../services/ChatbotService';
import { useApp } from '../../contexts/AppContext';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accountService, transactionService, isInitialized } = useApp();

  useEffect(() => {
    if (isInitialized && accountService && transactionService) {
      initializeChatbot();
    }
  }, [isInitialized, accountService, transactionService]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChatbot = async () => {
    try {
      if (accountService && transactionService) {
        await ChatbotService.initialize(accountService, transactionService);
        setIsInitializing(false);
        
        // Add welcome message
        addMessage({
          id: '0',
          role: 'assistant',
          content: `Hello! 👋 I'm your CashFlow Manager assistant. I can help you:\n\n- Check your balance\n- View your accounts\n- See recent transactions\n- Learn about account types and categories\n\nHow can I help you today?`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error initializing chatbot:', error);
      setIsInitializing(false);
      addMessage({
        id: '0',
        role: 'assistant',
        content: 'Sorry, I had trouble initializing. Some features may not work properly.',
        timestamp: new Date(),
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputValue('');
    setIsProcessing(true);

    try {
      const response = await ChatbotService.processMessage(inputValue);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `[Uploaded image: ${file.name}]`,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setIsProcessing(true);

    try {
      const text = await ChatbotService.processImage(file);
      const response = await ChatbotService.analyzeImageText(text);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing the image. Please try again or ensure the image is clear.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Tooltip title="Open AI Assistant" placement="left">
        <Fab
          color="secondary"
          aria-label="chatbot"
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, md: 24 },
            right: 24,
            zIndex: 1000,
          }}
        >
          <MessageCircle size={24} />
        </Fab>
      </Tooltip>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Bot size={24} />
              <Typography variant="h6">AI Assistant</Typography>
            </Box>
            <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
              <X size={24} />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: '#f5f5f5',
            }}
          >
            {isInitializing ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }}>Initializing AI assistant...</Typography>
                </Box>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {messages.map((message) => (
                  <ListItem
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-start',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {message.role === 'assistant' && (
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <Bot size={18} />
                      </Avatar>
                    )}
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: '75%',
                        bgcolor: message.role === 'user' ? 'primary.main' : 'white',
                        color: message.role === 'user' ? 'white' : 'text.primary',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {message.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          opacity: 0.7,
                          fontSize: '0.65rem',
                        }}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Paper>
                    {message.role === 'user' && (
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                        <User size={18} />
                      </Avatar>
                    )}
                  </ListItem>
                ))}
                {isProcessing && (
                  <ListItem sx={{ justifyContent: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1 }}>
                      <Bot size={18} />
                    </Avatar>
                    <Paper sx={{ p: 1.5 }}>
                      <CircularProgress size={20} />
                    </Paper>
                  </ListItem>
                )}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImageIcon size={16} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isInitializing}
              >
                Upload Image
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing || isInitializing}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing || isInitializing}
              >
                <Send size={24} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Chatbot;
