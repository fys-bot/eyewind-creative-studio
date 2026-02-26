import React, { useState, useEffect } from 'react';
import { X, Copy, Check, UserPlus, Globe, Shield, Lock, ChevronDown, Users, Link as LinkIcon, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ui/ToastContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'zh' | 'tw';
  projectId?: string; // Optional for now
}

// Mock Data for Team Members
const MOCK_TEAM_MEMBERS = [
  { id: '1', name: 'Alice Chen', email: 'alice@nexus.ai', role: 'owner', avatar: 'AC' },
  { id: '2', name: 'Bob Smith', email: 'bob@nexus.ai', role: 'editor', avatar: 'BS' },
  { id: '3', name: 'Charlie Wu', email: 'charlie@nexus.ai', role: 'viewer', avatar: 'CW' },
];

export const TeamShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, lang }) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [members, setMembers] = useState(MOCK_TEAM_MEMBERS);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleInvite = () => {
    if (!email.trim()) return;
    setInviteStatus('sending');
    
    // Simulate API call
    setTimeout(() => {
      // Check if user exists (mock logic)
      const existingUser = members.find(m => m.email === email || m.name === email);
      
      if (existingUser) {
        // User already in team
        addToast(lang === 'zh' || lang === 'tw' ? '该用户已在团队中' : 'User already in team', 'error');
      } else {
        // Add new member (mock)
        const newMember = {
          id: Date.now().toString(),
          name: email.split('@')[0],
          email: email,
          role: role,
          avatar: email.substring(0, 2).toUpperCase()
        };
        setMembers([...members, newMember]);
        addToast(lang === 'zh' || lang === 'tw' ? '邀请已发送' : 'Invitation sent', 'success');
      }
      
      setInviteStatus('sent');
      setTimeout(() => {
        setInviteStatus('idle');
        setEmail('');
      }, 2000);
    }, 1000);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    addToast(lang === 'zh' || lang === 'tw' ? '成员已移除' : 'Member removed', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-black/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500">
              <Users size={18} />
            </div>
            {lang === 'zh' || lang === 'tw' ? '团队协作' : 'Team Collaboration'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Invite Section */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'zh' || lang === 'tw' ? '输入邮箱邀请成员...' : 'Enter email to invite...'}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="editor">{lang === 'zh' || lang === 'tw' ? '可编辑' : 'Can Edit'}</option>
              <option value="viewer">{lang === 'zh' || lang === 'tw' ? '仅查看' : 'Can View'}</option>
            </select>
            <button 
              onClick={handleInvite}
              disabled={!email.trim() || inviteStatus !== 'idle'}
              className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-all ${inviteStatus === 'sent' ? 'bg-green-500' : 'bg-black dark:bg-white dark:text-black hover:opacity-80'}`}
            >
              {inviteStatus === 'sending' ? '...' : inviteStatus === 'sent' ? <Check size={16} /> : (lang === 'zh' || lang === 'tw' ? '邀请' : 'Invite')}
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {lang === 'zh' || lang === 'tw' ? '团队成员' : 'Team Members'}
            </h4>
            <div className="max-h-[240px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                      {member.role === 'owner' 
                        ? (lang === 'zh' || lang === 'tw' ? '所有者' : 'Owner')
                        : member.role === 'editor'
                          ? (lang === 'zh' || lang === 'tw' ? '编辑' : 'Editor')
                          : (lang === 'zh' || lang === 'tw' ? '查看' : 'Viewer')
                      }
                    </span>
                    {member.role !== 'owner' && (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                        title={lang === 'zh' || lang === 'tw' ? '移除成员' : 'Remove member'}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const PublicLinkModal: React.FC<ShareModalProps> = ({ isOpen, onClose, lang }) => {
  const { addToast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  
  // Mock Link
  const publicLink = "https://nexus.studio/p/a8f9-23j9-ck92";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicLink);
        setCopied(true);
        addToast(lang === 'zh' || lang === 'tw' ? '链接已复制' : 'Link copied', 'success');
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      // Fallback for non-secure contexts (http)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = publicLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            setCopied(true);
            addToast(lang === 'zh' || lang === 'tw' ? '链接已复制' : 'Link copied', 'success');
        } else {
            throw new Error('Fallback copy failed');
        }
      } catch (fallbackErr) {
        console.error('Copy failed', fallbackErr);
        addToast(lang === 'zh' || lang === 'tw' ? '复制失败，请手动复制' : 'Copy failed, please copy manually', 'error');
      }
    }
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-black/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-500">
              <Globe size={18} />
            </div>
            {lang === 'zh' || lang === 'tw' ? '公开链接' : 'Public Link'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {lang === 'zh' || lang === 'tw' ? '启用公开访问' : 'Enable Public Access'}
              </span>
              <span className="text-xs text-gray-500">
                {lang === 'zh' || lang === 'tw' ? '任何拥有链接的人都可以查看' : 'Anyone with the link can view'}
              </span>
            </div>
            <button 
              onClick={() => setIsEnabled(!isEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${isEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Link Section */}
          <AnimatePresence>
            {isEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly 
                    value={publicLink}
                    className="w-full pl-4 pr-24 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 outline-none"
                  />
                  <button 
                    onClick={handleCopy}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? (lang === 'zh' || lang === 'tw' ? '已复制' : 'Copied') : (lang === 'zh' || lang === 'tw' ? '复制' : 'Copy')}
                  </button>
                </div>

                {/* Password Option */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <Shield size={12} />
                    {lang === 'zh' || lang === 'tw' ? '安全设置' : 'Security Settings'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={lang === 'zh' || lang === 'tw' ? '设置访问密码 (可选)' : 'Set access password (optional)'}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
