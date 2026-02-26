import { useState, FormEvent } from 'react';
import { X, Mail, Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

type Props = {
    onClose: () => void;
};

export default function ForgotPasswordModal({ onClose }: Props) {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [pass, setPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            if (!email) {
                setError('Please enter your email address');
                return;
            }
            // In a real app, we would request OTP here. 
            // For this dev setup, we just move to step 2 where user enters '1234'
            setStep(2);
            return;
        }

        if (step === 2) {
            if (!otp || !pass) {
                setError('Please fill in all fields');
                return;
            }
            if (pass.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }

            setLoading(true);
            try {
                await api.auth.resetPassword(email, otp, pass);
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 2000);
            } catch (err: any) {
                setError(err.message || 'Failed to reset password');
            } finally {
                setLoading(false);
            }
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                        <ShieldCheck className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h3>
                    <p className="text-gray-500">Your password has been successfully updated. You can now log in with your new password.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className={`h-2 w-16 rounded-full mx-1 transition-colors ${step === 1 ? 'bg-blue-600' : 'bg-blue-200'}`} />
                        <div className={`h-2 w-16 rounded-full mx-1 transition-colors ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    </div>

                    {step === 1 ? (
                        <div className="space-y-4 animate-in slide-in-from-right duration-300">
                            <p className="text-sm text-gray-600 text-center mb-4">
                                Enter your registered email address to receive a verification code.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder="admin@company.com"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right duration-300">
                            <p className="text-sm text-gray-600 text-center mb-4">
                                Enter the OTP sent to <strong>{email}</strong> (Hint: use 1234) and your new password.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder="Enter 4-digit OTP"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        value={pass}
                                        onChange={(e) => setPass(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 animate-in fade-in">
                            <ShieldCheck size={16} />
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : step === 1 ? (
                                <>Next Step <ArrowRight size={18} /></>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </div>

                    {step === 2 && (
                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(''); }}
                            className="w-full text-sm text-gray-500 hover:text-gray-700"
                        >
                            Back to Email
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
