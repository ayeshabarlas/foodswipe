"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck, FaUpload, FaIdCard, FaStore, FaMoneyBill, FaCamera, FaSpinner } from "react-icons/fa";
import axios from "axios";
import { getApiUrl() } from "../utils/config";

interface VerificationProps {
    onComplete: () => void;
}

export default function RestaurantVerification({ onComplete }: VerificationProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [errors, setErrors] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        ownerCNIC: "",
        accountTitle: "",
        iban: "",
        bankName: "",
        cnicFront: "",
        cnicBack: "",
        license: "",
        menu: "",
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append("file", file);

        try {
            setLoading(true);
            // Simulate AI Scanning for documents
            if (field.includes('cnic') || field === 'license') {
                setScanning(true);
                for (let i = 0; i <= 100; i += 10) {
                    setScanProgress(i);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                setScanning(false);
                setScanProgress(0);
            }

            const res = await axios.post(`${getApiUrl()}/api/upload`, uploadData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setFormData(prev => ({ ...prev, [field]: res.data.imageUrl }));

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const validateStep = (currentStep: number): boolean => {
        const newErrors: string[] = [];

        if (currentStep === 1) {
            if (!formData.license) {
                newErrors.push("Please upload Restaurant License / NTN");
            }
        }

        if (currentStep === 2) {
            if (!formData.ownerCNIC) {
                newErrors.push("Please enter CNIC number");
            } else if (!/^\d{5}-\d{7}-\d$/.test(formData.ownerCNIC)) {
                newErrors.push("CNIC format should be: 42201-1234567-1");
            }
            if (!formData.cnicFront) {
                newErrors.push("Please upload CNIC front photo");
            }
            if (!formData.cnicBack) {
                newErrors.push("Please upload CNIC back photo");
            }
        }

        if (currentStep === 3) {
            if (!formData.bankName) {
                newErrors.push("Please enter bank name");
            }
            if (!formData.accountTitle) {
                newErrors.push("Please enter account title");
            }
            if (!formData.iban) {
                newErrors.push("Please enter IBAN number");
            } else if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(formData.iban.replace(/\s/g, ''))) {
                newErrors.push("Invalid IBAN format. Should start with PK followed by digits");
            }
        }

        if (currentStep === 4) {
            if (!formData.menu) {
                newErrors.push("Please upload menu/kitchen photos");
            }
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            setErrors([]);
        }
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        setErrors([]);
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;
        try {
            setLoading(true);
            const token = JSON.parse(localStorage.getItem("userInfo") || "{}").token;

            await axios.post(
                `${getApiUrl()}/api/restaurants/verify`,
                {
                    ownerCNIC: formData.ownerCNIC,
                    bankDetails: {
                        accountTitle: formData.accountTitle,
                        iban: formData.iban,
                        bankName: formData.bankName,
                    },
                    documents: {
                        cnicFront: formData.cnicFront,
                        cnicBack: formData.cnicBack,
                        license: formData.license,
                        menu: formData.menu,
                    },
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            onComplete();
        } catch (error) {
            console.error("Verification submission failed", error);
            alert("Submission failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-2xl shadow-xl text-white">
            {/* Progress Bar */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -z-10 rounded-full" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
                    style={{ width: `${((step - 1) / 3) * 100}%` }}
                />
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= s ? "bg-primary text-white scale-110" : "bg-gray-700 text-gray-400"
                            }`}
                    >
                        {step > s ? <FaCheck /> : s}
                    </div>
                ))}
            </div>

            {/* Scanning Overlay */}
            <AnimatePresence>
                {scanning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center rounded-2xl"
                    >
                        <div className="w-64 h-40 border-2 border-primary rounded-lg relative overflow-hidden mb-4">
                            <motion.div
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 w-full h-1 bg-primary shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                            />
                            <div className="absolute inset-0 bg-primary/10" />
                        </div>
                        <h3 className="text-xl font-bold text-primary mb-2">AI Verifying Document...</h3>
                        <p className="text-gray-400">Checking for forgery and readability</p>
                        <div className="w-64 h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${scanProgress}%` }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Messages */}
            {errors.length > 0 && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-red-400 mb-2">Please fix the following errors:</h3>
                    <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-300">{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="min-h-[400px]">
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <FaStore className="text-primary" /> Business Verification
                        </h2>
                        <div className="space-y-4">
                            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                <label className="block text-sm text-gray-400 mb-2">Restaurant License / NTN</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileUpload(e, 'license')}
                                        className="hidden"
                                        id="license-upload"
                                    />
                                    <label
                                        htmlFor="license-upload"
                                        className="flex-1 h-32 border-2 border-dashed border-gray-500 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-700 transition-all"
                                    >
                                        {formData.license ? (
                                            <div className="text-green-400 flex flex-col items-center">
                                                <FaCheck size={24} className="mb-2" />
                                                <span>Uploaded</span>
                                            </div>
                                        ) : (
                                            <>
                                                <FaUpload size={24} className="mb-2 text-gray-400" />
                                                <span className="text-sm text-gray-400">Upload Certificate</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <FaIdCard className="text-primary" /> Owner Identity
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="CNIC Number (e.g., 42201-1234567-1)"
                                value={formData.ownerCNIC}
                                onChange={(e) => setFormData({ ...formData, ownerCNIC: e.target.value })}
                                className="w-full bg-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">CNIC Front</label>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileUpload(e, 'cnicFront')}
                                        className="hidden"
                                        id="cnic-front"
                                    />
                                    <label
                                        htmlFor="cnic-front"
                                        className="h-32 border-2 border-dashed border-gray-500 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-700 transition-all"
                                    >
                                        {formData.cnicFront ? <FaCheck className="text-green-400" size={24} /> : <FaIdCard size={24} className="text-gray-400" />}
                                        <span className="text-xs mt-2 text-gray-400">Front Side</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">CNIC Back</label>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileUpload(e, 'cnicBack')}
                                        className="hidden"
                                        id="cnic-back"
                                    />
                                    <label
                                        htmlFor="cnic-back"
                                        className="h-32 border-2 border-dashed border-gray-500 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-700 transition-all"
                                    >
                                        {formData.cnicBack ? <FaCheck className="text-green-400" size={24} /> : <FaIdCard size={24} className="text-gray-400" />}
                                        <span className="text-xs mt-2 text-gray-400">Back Side</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <FaMoneyBill className="text-primary" /> Bank Details
                        </h2>
                        <div className="space-y-4">
                            <select
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                className="w-full bg-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select Bank</option>
                                <option value="HBL">Habib Bank Limited (HBL)</option>
                                <option value="UBL">United Bank Limited (UBL)</option>
                                <option value="MCB">MCB Bank</option>
                                <option value="ABL">Allied Bank Limited (ABL)</option>
                                <option value="NBP">National Bank of Pakistan (NBP)</option>
                                <option value="Meezan">Meezan Bank</option>
                                <option value="Standard Chartered">Standard Chartered</option>
                                <option value="Faysal Bank">Faysal Bank</option>
                                <option value="Bank Alfalah">Bank Alfalah</option>
                                <option value="JS Bank">JS Bank</option>
                                <option value="Askari Bank">Askari Bank</option>
                                <option value="Soneri Bank">Soneri Bank</option>
                                <option value="Dubai Islamic">Dubai Islamic Bank</option>
                                <option value="Summit Bank">Summit Bank</option>
                                <option value="Silk Bank">Silk Bank</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Account Title"
                                value={formData.accountTitle}
                                onChange={(e) => setFormData({ ...formData, accountTitle: e.target.value })}
                                className="w-full bg-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                                type="text"
                                placeholder="IBAN Number (e.g., PK36SCBL0000001123456702)"
                                value={formData.iban}
                                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                className="w-full bg-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <FaCamera className="text-primary" /> Photos & Menu
                        </h2>
                        <div className="space-y-4">
                            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                <label className="block text-sm text-gray-400 mb-2">Menu / Kitchen Photos</label>
                                <input
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, 'menu')}
                                    className="hidden"
                                    id="menu-upload"
                                />
                                <label
                                    htmlFor="menu-upload"
                                    className="h-40 border-2 border-dashed border-gray-500 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-700 transition-all"
                                >
                                    {formData.menu ? (
                                        <div className="text-green-400 flex flex-col items-center">
                                            <FaCheck size={32} className="mb-2" />
                                            <span>Uploaded Successfully</span>
                                        </div>
                                    ) : (
                                        <>
                                            <FaCamera size={32} className="mb-2 text-gray-400" />
                                            <span className="text-sm text-gray-400">Upload Photos</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                {step > 1 && (
                    <button
                        onClick={prevStep}
                        className="px-6 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition-all"
                    >
                        Back
                    </button>
                )}
                {step < 4 ? (
                    <button
                        onClick={nextStep}
                        className="ml-auto px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-red-600 transition-all"
                    >
                        Next Step
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="ml-auto px-8 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all flex items-center gap-2"
                    >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Submit Verification
                    </button>
                )}
            </div>
        </div>
    );
}

