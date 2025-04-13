import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Loader2, Copy, Check, Edit2, Trash2, Search, Sun, Moon, Star } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mime from 'mime-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  isEdited?: boolean;
  isImportant?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Merhaba, yüklediğini kullanıcı kılavuzuyla ilgili sorularınızda size yardımcı olmak için buradayım. Öncelikle API anahtarınızı girmeniz ve kullanım kılavuzu PDF\'ini yüklemeniz gerekmektedir.\n\nDaha sonra sorularınızı yanıtlamaktan memnuniyet duyarım.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    if (!apiKey || !selectedFile) return;

    try {
      setIsLoading(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
      });

      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      };

      // Read file content as base64
      const fileBuffer = await selectedFile.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const chat = await model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: selectedFile.type || 'application/pdf',
                  data: base64Data
                }
              },
              {
                text: "Sana verilen bu kullanım kılavuzunu iyi analiz et ve kullanıcının sorduğu sorulara bu döküman üzerinden uygun yanıtlar oluştur"
              }
            ]
          }
        ]
      });

      setChatSession(chat);
      setShowApiInput(false);
      setMessages([
        {
          role: 'assistant',
          content: '\n\nLütfen sorunuzu belirtin, kılavuzdan ilgili bilgiyi bulup size aktarmaktan memnuniyet duyarım.'
        }
      ]);
    } catch (error) {
      console.error('Initialization error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, sohbeti başlatırken bir hata oluştu. Lütfen API anahtarınızı ve PDF dosyanızı kontrol edip tekrar deneyin.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  const handleEditMessage = (index: number) => {
    setEditingMessageIndex(index);
    setInput(messages[index].content);
  };

  const handleDeleteMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleImportant = (index: number) => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, isImportant: !msg.isImportant } : msg
    ));
  };

  const filteredMessages = messages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatSession) return;

    const userMessage = input.trim();
    setInput('');
    
    if (editingMessageIndex !== null) {
      setMessages(prev => prev.map((msg, i) => 
        i === editingMessageIndex 
          ? { ...msg, content: userMessage, isEdited: true }
          : msg
      ));
      setEditingMessageIndex(null);
    } else {
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: userMessage,
        timestamp: new Date()
      }]);
    }

    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage(userMessage);
      const response = await result.response.text();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  if (showApiInput) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Bot className="w-8 h-8 text-blue-600 mr-2" />
            <h1 className="text-2xl font-semibold text-gray-800">
             Kullanıcı Kılavuzu Asistanı
            </h1>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gemini API Anahtarı
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-10 w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="API anahtarınızı girin..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanım Kılavuzu PDF
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <span className="text-gray-600">
                    {selectedFile ? selectedFile.name : 'PDF dosyası seçin...'}
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={initializeChat}
              disabled={!apiKey || !selectedFile || isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sohbeti Başlat'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <div className={`flex items-center justify-between bg-white shadow-sm p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
        <div className="flex items-center">
          <Bot className="w-6 h-6 text-blue-600 mr-2" />
          <h1 className="text-xl font-semibold text-gray-800">
            Kullanıcı Kılavuzu Asistanı
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mesajlarda ara..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[80%] ${
                message.role === 'user' ? '' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <Bot className="w-6 h-6 text-blue-600" />
              )}
              <div
                className={`p-3 rounded-lg relative group ${
                  message.role === 'user'
                    ? isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                    : isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {message.isImportant && (
                      <Star className="w-4 h-4 text-yellow-400" />
                    )}
                    {message.isEdited && (
                      <span className="text-xs opacity-70">(düzenlendi)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {message.role === 'user' && (
                      <>
                        <button
                          onClick={() => handleEditMessage(index)}
                          className="p-1 rounded-full hover:bg-blue-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(index)}
                          className="p-1 rounded-full hover:bg-blue-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleToggleImportant(index)}
                      className="p-1 rounded-full hover:bg-blue-500"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(message.content, index)}
                      className="p-1 rounded-full hover:bg-blue-500"
                    >
                      {copiedMessageIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.timestamp && (
                  <div className="text-xs mt-1 opacity-70">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <User className="w-6 h-6 text-gray-600" />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-sm text-gray-500">Yanıt hazırlanıyor...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sorunuzu yazın..."
            className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;