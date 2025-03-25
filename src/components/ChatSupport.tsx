import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Loader, AlertCircle, Paperclip, Check, CheckCheck } from 'lucide-react';
import { UserProfile } from '../types';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  message: string;
  is_support: boolean;
  created_at: string;
  attachment_url?: string;
  attachment_type?: string;
  read_at?: string;
}

interface ChatProps {
  isAdmin?: boolean;
}

interface TypingStatus {
  user_id: string;
  is_typing: boolean;
}

export function ChatSupport({ isAdmin = false }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [typingStatus, setTypingStatus] = useState<TypingStatus[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const setupChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      if (!isAdmin) {
        const { data: existingConv } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (existingConv) {
          setConversationId(existingConv.id);
        } else {
          const { data: newConv, error } = await supabase
            .from('chat_conversations')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (!error && newConv) {
            setConversationId(newConv.id);
          }
        }
      }

      setLoading(false);
    };

    setupChat();
  }, [isAdmin]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();

      // Subscribe to new messages
      const messageSubscription = supabase
        .channel('chat_messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined
        }, (payload) => {
          setMessages(current => [...current, payload.new as Message]);
          markMessageAsRead(payload.new.id);
        })
        .subscribe();

      // Subscribe to typing status
      const typingSubscription = supabase
        .channel('typing_status')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_typing_status',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined
        }, (payload) => {
          setTypingStatus(current => {
            const filtered = current.filter(status => status.user_id !== payload.new.user_id);
            return [...filtered, payload.new];
          });
        })
        .subscribe();

      return () => {
        messageSubscription.unsubscribe();
        typingSubscription.unsubscribe();
      };
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark all messages as read
      data?.forEach(message => {
        if (!message.read_at && message.user_id !== userId) {
          markMessageAsRead(message.id);
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await supabase
        .from('chat_typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          is_typing: isTyping,
          last_updated: new Date().toISOString()
        });

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          updateTypingStatus(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    try {
      const { error: uploadError, data } = await supabase.storage
        .from('profile-documents')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          }
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !userId) return;

    try {
      let attachmentUrl = '';
      let attachmentType = '';

      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
        attachmentType = selectedFile.type;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          message: newMessage.trim(),
          is_support: isAdmin,
          attachment_url: attachmentUrl || null,
          attachment_type: attachmentType || null
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!profile?.full_name && !isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Profile First</h3>
        <p className="text-gray-600 mb-4">
          Please complete your profile information before starting a chat with support.
          We need your name and contact details to better assist you.
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">
          {isAdmin ? 'Customer Support Dashboard' : 'Chat with Support'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.is_support ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.is_support
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {message.attachment_url && (
                <div className="mb-2">
                  {message.attachment_type?.startsWith('image/') ? (
                    <img 
                      src={message.attachment_url} 
                      alt="Attachment" 
                      className="max-w-full rounded"
                    />
                  ) : (
                    <a 
                      href={message.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm underline"
                    >
                      <Paperclip className="w-4 h-4 mr-1" />
                      View Attachment
                    </a>
                  )}
                </div>
              )}
              <p className="text-sm">{message.message}</p>
              <div className={`text-xs mt-1 flex items-center gap-1 ${
                message.is_support ? 'text-gray-500' : 'text-blue-100'
              }`}>
                {formatTime(message.created_at)}
                {message.read_at ? (
                  <CheckCheck className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>
        ))}
        {typingStatus.some(status => status.is_typing && status.user_id !== userId) && (
          <div className="text-sm text-gray-500 italic">
            Someone is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              updateTypingStatus(e.target.value.length > 0);
            }}
            onBlur={() => updateTypingStatus(false)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-100 text-gray-600 rounded-lg px-4 py-2 hover:bg-gray-200"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim() && !selectedFile}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {selectedFile && (
          <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            {selectedFile.name}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}