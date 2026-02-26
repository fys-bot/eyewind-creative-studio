
import React, { useState, useEffect } from 'react';
import { MessageSquare, Shield } from 'lucide-react';
import { getTickets } from '../../../services/adminService';
import { SupportTicket } from '../../../types';

interface TicketSystemViewProps {
    t: any;
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        high: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800',
        medium: 'bg-yellow-50 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        low: 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:border-green-800',
        open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        resolved: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
};

export const TicketSystemView: React.FC<TicketSystemViewProps> = ({ t }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    
    useEffect(() => {
        getTickets().then(setTickets);
    }, []);

    return (
        <div className="flex gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Ticket List */}
            <div className="w-1/3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t?.nav?.tickets}</h3>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-gray-100 dark:bg-gray-800 text-xs font-bold py-1.5 rounded-lg text-gray-900 dark:text-white">Open</button>
                        <button className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold py-1.5 rounded-lg text-gray-500">Closed</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {tickets.map(tk => (
                        <div key={tk.id} className="p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                            <div className="flex justify-between mb-1">
                                <StatusBadge status={tk.priority} />
                                <span className="text-[10px] text-gray-400">{new Date(tk.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{tk.subject}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tk.message}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                                    {tk.userName.charAt(0)}
                                </div>
                                <span className="text-[10px] text-gray-500">{tk.userName}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ticket Detail */}
            <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/30 dark:bg-gray-800/10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tickets[0]?.subject || "Select a ticket"}</h2>
                            {tickets[0] && <StatusBadge status={tickets[0].status} />}
                        </div>
                        <p className="text-sm text-gray-500">Ticket ID: #{tickets[0]?.id.toUpperCase()} • via {tickets[0]?.category}</p>
                    </div>
                    {tickets[0] && (
                        <button className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700">
                            Mark as Resolved
                        </button>
                    )}
                </div>
                
                {tickets[0] ? (
                    <>
                        <div className="flex-1 p-6 overflow-y-auto">
                            {/* Original Message */}
                            <div className="flex gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold">
                                    {tickets[0].userName.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-bold text-gray-900 dark:text-white">{tickets[0].userName}</span>
                                        <span className="text-xs text-gray-400">{new Date(tickets[0].createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-r-2xl rounded-bl-2xl">
                                        {tickets[0].message}
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-8">
                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                <span className="text-xs font-bold text-gray-400 uppercase">Today</span>
                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                            </div>

                            {/* Reply Input */}
                            <div className="mt-auto">
                                <textarea 
                                    className="w-full h-32 p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl resize-none text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                    placeholder="Type your reply here..."
                                />
                                <div className="flex justify-between items-center mt-3">
                                    <div className="flex gap-2">
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><MessageSquare size={16}/></button>
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><Shield size={16}/></button>
                                    </div>
                                    <button className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-lg">Reply</button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare size={48} className="mb-4 opacity-20"/>
                        <p>Select a ticket to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};
