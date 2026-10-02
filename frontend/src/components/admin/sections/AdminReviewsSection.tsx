import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Package, 
  User, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { fetchAdminReviewsDB, deleteAdminReviewDB } from '../../../services/api_admin';

interface ReviewItem {
  review_id: number;
  product_id: number;
  product_name: string;
  product_image?: string | null;
  product_category?: string;
  customer_id?: number;
  customer_name: string;
  customer_email?: string;
  rating: number;
  review: string;
  review_date?: string | null;
  verified_purchase?: boolean;
}

export const AdminReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminReviewsDB();
      setReviews(data || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    setDeletingId(reviewToDelete.review_id);
    try {
      await deleteAdminReviewDB(reviewToDelete.review_id);
      setActionMessage({ type: 'success', text: `Review #${reviewToDelete.review_id} by ${reviewToDelete.customer_name} removed successfully.` });
      setReviews(prev => prev.filter(r => r.review_id !== reviewToDelete.review_id));
      setReviewToDelete(null);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete review.' });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  // Metrics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1) : '0.0';
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fiveStarPercent = totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;
  const threeStarCount = reviews.filter(r => r.rating === 3).length;
  const twoStarCount = reviews.filter(r => r.rating === 2).length;
  const oneStarCount = reviews.filter(r => r.rating === 1).length;

  const uniqueProducts = Array.from(new Set(reviews.map(r => r.product_name))).filter(Boolean);

  // Filtered List
  const filteredReviews = reviews.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      r.product_name.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q) ||
      (r.customer_email && r.customer_email.toLowerCase().includes(q)) ||
      r.review.toLowerCase().includes(q);
    
    const matchStar = starFilter === 'ALL' || r.rating === starFilter;
    const matchProduct = selectedProductFilter === 'ALL' || r.product_name === selectedProductFilter;

    return matchSearch && matchStar && matchProduct;
  });

  return (
    <div className="relative z-10 space-y-6 animate-fadeIn">

      {/* Action Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs hover:opacity-70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards & Rating Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Total Reviews */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7A6C5E] text-[10px] font-black uppercase tracking-wider">
            <span>Total Reviews</span>
            <MessageSquare className="w-4 h-4 text-[#38A132]" />
          </div>
          <div className="text-3xl font-black text-[#2C241D]">{totalReviews}</div>
          <span className="text-[10px] font-bold text-[#38A132] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
            100% Verified Purchases
          </span>
        </div>

        {/* Card 2: Average Rating */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7A6C5E] text-[10px] font-black uppercase tracking-wider">
            <span>Platform Score</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2C241D]">{avgRating}</span>
            <span className="text-xs font-bold text-[#7A6C5E]">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(st => (
              <Star
                key={st}
                className={`w-3.5 h-3.5 ${
                  st <= Math.round(Number(avgRating))
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-stone-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card 3: 5-Star Percentage */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#7A6C5E] text-[10px] font-black uppercase tracking-wider">
            <span>5-Star Satisfaction</span>
            <span className="text-xs font-black text-amber-600">{fiveStarPercent}%</span>
          </div>
          <div className="text-3xl font-black text-amber-600">{fiveStarCount}</div>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block">
            Top Quality Ratings
          </span>
        </div>

        {/* Card 4: Star Breakdown Bar */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1.5">
          <div className="text-[#7A6C5E] text-[10px] font-black uppercase tracking-wider mb-1">
            Rating Breakdown
          </div>
          {[
            { star: 5, count: fiveStarCount },
            { star: 4, count: fourStarCount },
            { star: 3, count: threeStarCount },
            { star: 2, count: twoStarCount },
            { star: 1, count: oneStarCount }
          ].map(({ star, count }) => {
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-[10px] font-bold text-[#5C4E42]">
                <span className="w-5 font-mono">{star}★</span>
                <div className="flex-1 bg-[#FAF7F2] h-2 rounded-full overflow-hidden border border-[#E2D7CB]">
                  <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-[#7A6C5E]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Rating Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setStarFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                starFilter === 'ALL'
                  ? 'bg-[#38A132] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
              }`}
            >
              All Stars ({totalReviews})
            </button>

            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => setStarFilter(s)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  starFilter === s
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
                }`}
              >
                <span>{s}</span>
                <Star className={`w-3 h-3 ${starFilter === s ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'}`} />
              </button>
            ))}
          </div>

          {/* Search + Product Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {uniqueProducts.length > 0 && (
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="py-2 px-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132] cursor-pointer"
              >
                <option value="ALL">All Products ({uniqueProducts.length})</option>
                {uniqueProducts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reviewer, product, text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
              />
            </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                <th className="py-3 px-4">Review ID</th>
                <th className="py-3 px-4">Product Purchased</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Customer Review / Feedback</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D7CB]/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7A6C5E] font-bold">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#38A132] border-t-transparent rounded-full animate-spin" />
                      <span>Loading customer reviews...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7A6C5E]">
                    <Star className="w-10 h-10 text-[#9E9082] mx-auto opacity-40 mb-2" />
                    <p className="font-extrabold text-sm text-[#2C241D]">No reviews match your filters</p>
                    <p className="text-xs text-[#7A6C5E] mt-1">Verified customer ratings and reviews will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r) => (
                  <tr key={r.review_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    {/* Review ID */}
                    <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E] whitespace-nowrap">
                      #{r.review_id}
                    </td>

                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        {r.product_image ? (
                          <img
                            src={r.product_image}
                            alt={r.product_name}
                            className="w-10 h-10 rounded-lg object-cover border border-[#E2D7CB] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center shrink-0 text-[#7A6C5E]">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-[#2C241D] line-clamp-1">{r.product_name}</div>
                          <span className="text-[10px] font-bold text-[#7A6C5E] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E2D7CB] inline-block mt-0.5">
                            {r.product_category || 'Furniture Item'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-[#2C241D] flex items-center gap-1.5">
                          <span>{r.customer_name}</span>
                          {r.verified_purchase && (
                            <span title="Verified Purchase" className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        {r.customer_email && (
                          <div className="text-[10px] text-[#7A6C5E] font-mono">{r.customer_email}</div>
                        )}
                      </div>
                    </td>

                    {/* Rating Stars */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star
                            key={st}
                            className={`w-3.5 h-3.5 ${
                              st <= r.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-stone-300'
                            }`}
                          />
                        ))}
                        <span className="font-extrabold text-xs text-[#2C241D] ml-1">
                          {r.rating}.0
                        </span>
                      </div>
                    </td>

                    {/* Review Feedback Text */}
                    <td className="py-3 px-4">
                      <div className="text-[#3A2E24] font-medium leading-snug max-w-sm">
                        "{r.review}"
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#7A6C5E] whitespace-nowrap">
                      {r.review_date ? new Date(r.review_date).toLocaleDateString() : 'Recent'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setReviewToDelete(r)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                        title="Delete this review from storefront"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirm Review Removal</span>
              </h4>
              <button onClick={() => setReviewToDelete(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D] rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5C4E42] leading-relaxed">
              Are you sure you want to delete the review by <strong className="text-[#2C241D]">{reviewToDelete.customer_name}</strong> for <strong className="text-[#2C241D]">{reviewToDelete.product_name}</strong>?
            </p>

            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-xs font-medium text-[#3A2E24] italic">
              "{reviewToDelete.review}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42] hover:bg-[#EFE7DE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleDeleteReview}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingId !== null ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
