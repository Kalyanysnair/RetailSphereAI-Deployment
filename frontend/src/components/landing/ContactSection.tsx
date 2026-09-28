import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Loader2 } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      return {
        name: user?.username || user?.full_name || user?.fullName || user?.name || '',
        email: user?.email || '',
        subject: '',
        message: '',
      };
    } catch {
      return {
        name: '',
        email: '',
        subject: '',
        message: '',
      };
    }
  });

  useEffect(() => {
    const fetchUserFromDB = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          const dbName = u.full_name || u.fullName || u.username || u.name || '';
          const dbEmail = u.email || '';
          if (dbName || dbEmail) {
            setFormData((prev) => ({
              ...prev,
              name: dbName || prev.name,
              email: dbEmail || prev.email,
            }));
          }
        }
      } catch (e) {
        // ignore
      }

      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const { getCurrentUser } = await import('../../services/api');
          const dbUser = await getCurrentUser();
          if (dbUser) {
            const u = dbUser as any;
            const dbName = u.full_name || u.fullName || u.username || u.name || '';
            const dbEmail = u.email || '';
            setFormData((prev) => ({
              ...prev,
              name: dbName || prev.name,
              email: dbEmail || prev.email,
            }));
          }
        } catch (err) {
          console.warn("DB user query notice:", err);
        }
      }
    };

    fetchUserFromDB();
    window.addEventListener('storage', fetchUserFromDB);
    window.addEventListener('user-logged-in', fetchUserFromDB);
    return () => {
      window.removeEventListener('storage', fetchUserFromDB);
      window.removeEventListener('user-logged-in', fetchUserFromDB);
    };
  }, []);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message || submitting) return;

    setSubmitting(true);
    try {
      const endpoint = `${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/contact`;

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject || 'Custom Furniture Inquiry',
          message: formData.message,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData((prev) => ({ ...prev, subject: '', message: '' }));
      }, 4000);
    } catch (err) {
      console.warn("Contact inquiry submission notice:", err);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData((prev) => ({ ...prev, subject: '', message: '' }));
      }, 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="scroll-mt-24 py-2 sm:py-4 px-6 sm:px-8 lg:px-10 max-w-[1360px] mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-6 space-y-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] text-[11px] font-extrabold uppercase tracking-wider">
          DIRECT CONSULTATION
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
          Connect with Our Design Consultants
        </h2>
        <p className="text-xs sm:text-sm text-[#524538] font-bold">
          Have questions about custom orders, trade partnerships, or showroom visits? We are at your service.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Info Card */}
        <div className="lg:col-span-5 bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] text-[#2C241D] rounded-3xl p-8 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-extrabold text-2xl tracking-tight mb-6 text-[#2C241D]">Showroom Details</h3>

            <div className="space-y-6 text-xs sm:text-sm">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#2C241D]">Main Studio Showroom</h4>
                  <p className="text-xs text-[#524538] font-bold mt-0.5">
                    RetailSphere Experience Center<br />Ettumanoor, Kottayam, Kerala 686631
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#2C241D]">Call / WhatsApp</h4>
                  <p className="text-xs text-[#524538] font-bold mt-0.5">+91 9778237180</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-[#38A132]/15 border border-[#38A132]/30 text-[#38A132] shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#2C241D]">Studio Hours</h4>
                  <p className="text-xs text-[#524538] font-bold mt-0.5">
                    Mon – Sat: 9:00 AM – 7:00 PM<br />Sun: 10:00 AM – 5:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="lg:col-span-7 bg-[#FAF7F2]/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden text-[#2C241D]">
          <div className="relative z-10">
            {submitted ? (
              <div className="p-8 text-center bg-emerald-50 border border-emerald-300 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-[#38A132] mx-auto mb-3" />
                <h4 className="text-lg font-extrabold text-[#2C241D]">Consultation Request Submitted</h4>
                <p className="text-xs text-[#524538] font-bold mt-1">
                  Thank you! Your consultation request has been submitted successfully. Our interior consultant will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#6B5C4D] mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full py-2.5 px-3.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-bold placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#6B5C4D] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="rahul@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full py-2.5 px-3.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-bold placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#6B5C4D] mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Custom Furniture Order Inquiry"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full py-2.5 px-3.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-bold placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#6B5C4D] mb-1">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your spatial requirements or furniture project..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="w-full py-2.5 px-3.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-bold placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#38A132]/25 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Consultation Request</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
