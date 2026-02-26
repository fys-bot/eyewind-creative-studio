import React from 'react';
import { Check, X, Zap, Crown, Users, Star } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { PlanType } from '../../types';
import { translations, Language } from '../../utils/translations';

interface SubscriptionModalProps {
    lang?: Language;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ lang = 'en' }) => {
    const { isSubscriptionOpen, closeSubscription, user, upgradePlan, openLogin } = useAuth();
    const { addToast } = useToast();
    const t = translations[lang].subscription;

    if (!isSubscriptionOpen) return null;

    const PLANS = [
        {
            id: 'free',
            name: t.plan_starter,
            price: '$0',
            period: '/mo',
            credits: 50,
            desc: t.desc_starter,
            features: [
                t.feat_access_gemini_flash,
                `50 ${t.credits_month}`,
                t.feat_standard_speed,
                t.feat_public_projects
            ],
            notIncluded: [
                t.not_veo,
                t.not_4k,
                t.not_team
            ],
            color: 'gray'
        },
        {
            id: 'pro',
            name: t.plan_pro,
            price: '$29',
            period: '/mo',
            credits: 1000,
            popular: true,
            desc: t.desc_pro,
            features: [
                t.feat_access_veo_pro,
                `1,000 ${t.credits_month}`,
                t.feat_fast_generation,
                t.feat_private_projects,
                t.feat_commercial_license,
                t.feat_priority_support
            ],
            notIncluded: [
                t.not_team
            ],
            color: 'blue'
        },
        {
            id: 'team',
            name: t.plan_team,
            price: '$99',
            period: '/mo',
            credits: 5000,
            desc: t.desc_team,
            features: [
                t.feat_all_pro,
                `5,000 ${t.credits_month}`,
                t.feat_concurrent,
                t.feat_team_workspace,
                t.feat_sso,
                t.feat_account_manager
            ],
            notIncluded: [],
            color: 'yellow'
        }
    ];

    const handleSubscribe = (planId: string) => {
        if (!user) {
            closeSubscription();
            openLogin();
            return;
        }
        // Simulate payment processing...
        const btn = document.getElementById(`sub-btn-${planId}`);
        if(btn) {
            btn.innerText = t.processing;
            btn.setAttribute('disabled', 'true');
        }
        
        setTimeout(() => {
            upgradePlan(planId as PlanType);
            addToast(t.subscribe_success.replace('{plan}', planId.toUpperCase()), 'success');
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={closeSubscription}></div>
            
            <div className="relative bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">
                <div className="p-6 md:p-8 flex justify-between items-start border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 flex-wrap tracking-tight">
                            {t.upgrade_modal_title}
                            <span className="text-xs bg-yellow-400 text-black px-3 py-1 rounded-full uppercase tracking-wider font-bold whitespace-nowrap shadow-sm flex items-center gap-1">
                                <Star size={10} fill="currentColor"/> {t.limited_offer}
                            </span>
                        </h2>
                        <p className="text-base text-gray-500 dark:text-gray-400 mt-2">{t.upgrade_desc}</p>
                    </div>
                    <button onClick={closeSubscription} className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0">
                        <X size={20} className="text-gray-600 dark:text-gray-300"/>
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => {
                            const isCurrent = user?.plan === plan.id;
                            const isPopular = plan.popular;
                            
                            return (
                                <div 
                                    key={plan.id}
                                    className={`relative rounded-2xl p-6 md:p-8 flex flex-col h-full border-2 transition-all duration-300 ${
                                        isPopular 
                                        ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02] z-10 bg-white dark:bg-gray-800' 
                                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-1'
                                    }`}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1.5">
                                            <Crown size={12} fill="currentColor"/> {t.most_popular}
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                                        <p className="text-sm text-gray-500 min-h-[40px]">{plan.desc}</p>
                                        <div className="mt-4 flex items-baseline gap-1">
                                            <span className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">{plan.price}</span>
                                            <span className="text-gray-400 font-bold text-lg">{plan.period}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mb-8 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                                            <Zap size={18} fill="currentColor"/>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">{plan.credits.toLocaleString()} {t.credits}</span>
                                    </div>

                                    <div className="space-y-4 mb-8 flex-1">
                                        {plan.features.map((feat, i) => (
                                            <div key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.id === 'free' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                    <Check size={12} strokeWidth={4}/>
                                                </div>
                                                <span className="font-medium leading-tight">{feat}</span>
                                            </div>
                                        ))}
                                        {plan.notIncluded.map((feat, i) => (
                                            <div key={i} className="flex items-start gap-3 text-sm text-gray-400 opacity-60">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800 mt-0.5">
                                                    <X size={12} strokeWidth={3}/>
                                                </div>
                                                <span className="font-medium leading-tight">{feat}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        id={`sub-btn-${plan.id}`}
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={isCurrent}
                                        className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm
                                            ${isCurrent 
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default border border-gray-200 dark:border-gray-700'
                                                : isPopular 
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5' 
                                                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5'
                                            }
                                        `}
                                    >
                                        {isCurrent ? t.current_plan : (plan.id === 'team' ? t.contact_sales : t.subscribe_now)}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t.secure_payment}
                </div>
            </div>
        </div>
    );
};
