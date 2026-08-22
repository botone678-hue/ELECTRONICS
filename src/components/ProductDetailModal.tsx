import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Zap,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Star,
  Heart,
  Share2,
  RotateCcw,
  MapPin
} from 'lucide-react';
import { Product, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onNavigateToCheckout: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onNavigateToCheckout,
  onSelectProduct
}) => {
  if (!product) return null;

  const { addToCart, buyNow } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { settings } = useSettings();

  const [selectedImage, setSelectedImage] = useState<string>(product.images[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'desc' | 'reviews' | 'delivery'>('specs');
  
  // Review submission state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [hasLoadedReviews, setHasLoadedReviews] = useState(false);

  // Load reviews when modal opens
  React.useEffect(() => {
    async function loadReviews() {
      try {
        const data = await api.getProduct(product!.id);
        setReviewsList(data.reviews || []);
        setHasLoadedReviews(true);
      } catch (e) {
        console.error(e);
      }
    }
    loadReviews();
  }, [product.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.submitReview(product.id, {
        customerName: reviewerName.trim() || undefined,
        rating: reviewRating,
        comment: reviewComment.trim()
      });
      setReviewsList([res.review, ...reviewsList]);
      setReviewSuccess('Thank you! Your verified review has been posted.');
      setReviewComment('');
      setReviewerName('');
      setTimeout(() => setReviewSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Could not submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const isFavorited = isInWishlist(product.id);
  const isOutOfStock = product.stockQuantity <= 0;

  const whatsappUrl = `https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
    `Hello MEGA CITY ELECTRONICS, I am interested in ordering: ${product.name} (SKU: ${product.sku}) listed at KSh ${product.price.toLocaleString()}. I would like to order via Cash on Delivery.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans">
      <div className="relative bg-[#09090b] border border-zinc-800 text-zinc-100 rounded-lg w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-product-modal"
          className="absolute top-3 right-3 z-20 p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Gallery Column */}
            <div className="space-y-2.5">
              <div className="relative aspect-4/3 sm:aspect-square w-full bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                <img
                  src={selectedImage || product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow uppercase tracking-wider">
                  CASH ON DELIVERY
                </div>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-14 h-14 rounded overflow-hidden border flex-shrink-0 cursor-pointer ${
                        selectedImage === img ? 'border-red-500' : 'border-zinc-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Callout */}
              <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1.5 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{product.warranty}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Truck className="w-3.5 h-3.5 text-red-500" />
                  <span>Express Delivery in Eldoret & Countrywide</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>Showroom Along Zion Mall, Eldoret</span>
                </div>
              </div>
            </div>

            {/* Product Meta Column */}
            <div className="space-y-3 flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="font-bold text-red-400 uppercase">{product.brand}</span>
                  <span>SKU: {product.sku}</span>
                </div>

                <h1 className="text-base sm:text-xl font-bold text-zinc-100 mt-1 leading-snug">
                  {product.name}
                </h1>

                {/* Ratings */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    {product.rating} ({product.reviewCount} reviews)
                  </span>
                </div>

                {/* Price Display */}
                <div className="mt-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-baseline justify-between">
                  <div>
                    <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                      KSh {product.price.toLocaleString()}
                    </div>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <div className="text-[11px] font-mono text-zinc-500 line-through mt-0.5">
                        MSRP: KSh {product.compareAtPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {product.discountPercent && product.discountPercent > 0 && (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      SAVE {product.discountPercent}%
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono">
                  {product.stockQuantity > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      IN STOCK ({product.stockQuantity} UNITS AVAILABLE)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      OUT OF STOCK
                    </span>
                  )}
                </div>

                {/* Quantity Selector */}
                {!isOutOfStock && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-zinc-400">QTY:</span>
                    <div className="flex items-center border border-zinc-750 bg-zinc-950 rounded overflow-hidden">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-2.5 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-xs font-mono font-bold text-zinc-100 min-w-[2rem] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                        className="px-2.5 py-1 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      buyNow(product, quantity);
                      onClose();
                      onNavigateToCheckout();
                    }}
                    disabled={isOutOfStock}
                    id="modal-buy-now-btn"
                    className={`py-2.5 px-3 rounded text-xs font-mono font-black flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer ${
                      isOutOfStock
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>BUY NOW (COD)</span>
                  </button>

                  <button
                    onClick={() => {
                      addToCart(product, quantity);
                      onClose();
                    }}
                    disabled={isOutOfStock}
                    id="modal-add-cart-btn"
                    className={`py-2.5 px-3 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isOutOfStock
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-red-500" />
                    <span>ADD TO CART</span>
                  </button>
                </div>

                {/* WhatsApp Order Button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="modal-whatsapp-btn"
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-mono py-2.5 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition border border-emerald-800"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>ORDER VIA WHATSAPP (INSTANT CONFIRMATION)</span>
                </a>

                {/* Direct Call assistance */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-0.5">
                  <span>NEED TELEPHONE ASSISTANCE?</span>
                  <a
                    href={`tel:${settings.phone}`}
                    className="text-red-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {settings.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section: Specifications, Description, Reviews, Delivery */}
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <div className="flex border-b border-zinc-800 gap-3 overflow-x-auto text-xs font-mono">
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-2 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'specs' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SPECIFICATIONS
              </button>
              <button
                onClick={() => setActiveTab('desc')}
                className={`pb-2 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'desc' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                DESCRIPTION
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'reviews' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                REVIEWS ({reviewsList.length})
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`pb-2 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'delivery' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                DELIVERY & PAYMENT
              </button>
            </div>

            <div className="py-4 text-left text-xs">
              {activeTab === 'specs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(product.specifications || {}).map(([key, val]) => (
                    <div key={key} className="bg-zinc-900 p-2.5 rounded border border-zinc-800 flex justify-between font-mono">
                      <span className="text-zinc-400 text-[11px]">{key}</span>
                      <span className="text-zinc-100 text-[11px] font-bold text-right">{val}</span>
                    </div>
                  ))}
                  <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800 flex justify-between font-mono">
                    <span className="text-zinc-400 text-[11px]">Warranty</span>
                    <span className="text-emerald-400 text-[11px] font-bold">{product.warranty}</span>
                  </div>
                  <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800 flex justify-between font-mono">
                    <span className="text-zinc-400 text-[11px]">Payment Terms</span>
                    <span className="text-zinc-100 text-[11px] font-bold">Cash on Delivery / M-Pesa</span>
                  </div>
                </div>
              )}

              {activeTab === 'desc' && (
                <div className="text-zinc-300 leading-relaxed space-y-3 text-xs">
                  <p>{product.description}</p>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded">
                    <h4 className="font-bold text-zinc-100 mb-1.5 font-mono">WHY BUY FROM MEGA CITY ELECTRONICS?</h4>
                    <ul className="space-y-1 text-[11px] text-zinc-400 font-mono">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        100% Genuine, brand-new factory-sealed electronics.
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        Inspect package thoroughly before paying upon delivery.
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        Official manufacturer warranty honored directly in Kenya.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {/* Reviews List */}
                  {reviewsList.length > 0 ? (
                    <div className="space-y-2">
                      {reviewsList.map((rev) => (
                        <div key={rev.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-100 text-xs font-mono">{rev.customerName}</span>
                              {rev.verifiedPurchase && (
                                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 py-0.2 rounded font-semibold">
                                  VERIFIED PURCHASE
                                </span>
                              )}
                            </div>
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400' : 'text-zinc-750'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-300">{rev.comment}</p>
                          <span className="text-[9px] font-mono text-zinc-500">
                            {new Date(rev.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-500 font-mono text-xs py-3 text-center">
                      No customer reviews yet. Be the first to review!
                    </div>
                  )}

                  {/* Add Review Form */}
                  <form onSubmit={handleReviewSubmit} className="p-3.5 bg-zinc-900 border border-zinc-800 rounded space-y-2.5">
                    <h4 className="text-xs font-bold text-zinc-100 font-mono">WRITE A CUSTOMER REVIEW</h4>
                    {reviewSuccess && (
                      <div className="p-2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-xs font-mono font-bold">
                        {reviewSuccess}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Your Name</label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="e.g. John K."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Rating</label>
                        <select
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-red-500"
                        >
                          <option value={5}>⭐⭐⭐⭐⭐ 5 Stars - Outstanding</option>
                          <option value={4}>⭐⭐⭐⭐ 4 Stars - Very Good</option>
                          <option value={3}>⭐⭐⭐ 3 Stars - Average</option>
                          <option value={2}>⭐⭐ 2 Stars - Below Expectation</option>
                          <option value={1}>⭐ 1 Star - Poor</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Your Experience / Review</label>
                      <textarea
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share details regarding sound, picture clarity, delivery..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-red-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-1.5 rounded transition"
                    >
                      {isSubmittingReview ? 'POSTING...' : 'POST REVIEW'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'delivery' && (
                <div className="space-y-2.5 text-zinc-300 text-xs leading-relaxed font-mono">
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-1.5">
                    <h4 className="font-bold text-zinc-100 text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-red-500" />
                      CASH ON DELIVERY POLICY
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      At MEGA CITY ELECTRONICS, you only pay when your equipment arrives safely at your doorstep or
                      collection point. Test and inspect before payment via Cash or M-Pesa.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                      <span className="font-bold text-zinc-200 block mb-0.5 text-[11px]">Eldoret CBD & Environs</span>
                      <span className="text-zinc-400 text-[10px]">1 to 3 Hours Express Doorstep Delivery</span>
                    </div>
                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                      <span className="font-bold text-zinc-200 block mb-0.5 text-[11px]">Rest of Kenya (47 Counties)</span>
                      <span className="text-zinc-400 text-[10px]">24 to 48 Hours via trusted parcel courier</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
