import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Upload, Key, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mime from 'mime-types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Merhaba, yüklediğini kullanıcı kılavuzuyla ilgili sorularınızda size yardımcı olmak için buradayım. Öncelikle API anahtarınızı girmeniz ve kullanım kılavuzu PDF\'ini yüklemeniz gerekmektedir.\n\nDaha sonra sorularınızı yanıtlamaktan memnuniyet duyarım.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatSession) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage(userMessage);
      const response = await result.response.text();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
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
                  <Upload className="w-5 h-5 text-gray-400 mr-2" />
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
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex items-center justify-center bg-white shadow-sm p-4 border-b">
        <Bot className="w-6 h-6 text-blue-600 mr-2" />
        <h1 className="text-xl font-semibold text-gray-800">
          Kullanıcı Kılavuzu Asistanı
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' ? (
                <User className="w-6 h-6 text-gray-600" />
              ) : (
                <Bot className="w-6 h-6 text-blue-600" />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sorunuzu yazın..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;