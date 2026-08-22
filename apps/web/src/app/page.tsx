import Link from "next/link";
import { 
  Wallet, 
  Map as MapIcon, 
  BedDouble, 
  ShieldAlert, 
  Bot,
  CheckCircle2,
  ChevronRight,
  QrCode,
  Radar,
  Siren,
  Star
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center">
              <MapIcon className="text-white w-4 h-4" />
            </div>
            <span className="font-[family-name:var(--font-heading)] font-bold text-xl tracking-tight text-[var(--dark)]">
              SoloWander
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-[var(--primary)] transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-[var(--primary)] transition-colors">Pricing</Link>
            <Link href="/blog" className="hover:text-[var(--primary)] transition-colors">Blog</Link>
            <Link href="/destinations" className="hover:text-[var(--primary)] transition-colors">Destinations</Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-[var(--dark)]">
              Log in
            </Link>
            <Link href="/register" className="px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[#c94508] transition-colors shadow-lg shadow-orange-500/20">
              Try on Web
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -z-10 w-full h-full bg-gradient-to-b from-[#FFF5F0] to-transparent" />
          <div className="absolute top-20 right-10 -z-10 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 -z-10 w-72 h-72 bg-[var(--secondary)]/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 text-center max-w-4xl">
            <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl lg:text-[64px] leading-tight font-bold text-[var(--dark)] mb-6">
              Travel solo. <span className="text-[var(--primary)]">Spend smart.</span> Stay safe.
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A solo traveller toolkit with Digital Tourist ID, geo-fencing safety, SOS incident response, budget tracking, and local travel intelligence in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-[var(--dark)] text-white font-semibold hover:bg-gray-800 transition-colors shadow-xl flex items-center justify-center gap-2">
                Get the App <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="#features" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-[var(--dark)] border border-gray-200 font-semibold hover:bg-gray-50 transition-colors">
                See Features
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex items-center ml-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              </div>
              <span className="ml-2 font-medium">Trusted by 10,000+ solo travellers</span>
            </div>

            {/* App Mockup Placeholder */}
            <div className="mt-16 mx-auto w-full max-w-2xl rounded-[2rem] border-8 border-gray-900 bg-white shadow-2xl aspect-[16/9] overflow-hidden flex items-center justify-center relative">
               <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100" />
               <div className="relative text-center">
                 <MapIcon className="w-16 h-16 text-[var(--primary)] mx-auto mb-4 opacity-50" />
                 <p className="font-medium text-gray-400">Dashboard Interface Mockup</p>
               </div>
            </div>
          </div>
        </section>

        {/* FEATURE STRIP */}
        <section className="border-y border-gray-200 bg-white py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { icon: Wallet, label: "Budget" },
                { icon: MapIcon, label: "Map" },
                { icon: BedDouble, label: "Stay" },
                { icon: ShieldAlert, label: "Safety App" },
                { icon: Bot, label: "AI Planner" },
              ].map((feature, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 text-gray-500 hover:text-[var(--primary)] transition-colors cursor-pointer">
                  <feature.icon className="w-8 h-8" />
                  <span className="text-sm font-semibold">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ALTERNATING FEATURES */}
        <section id="features" className="py-24 bg-[var(--background)]">
          <div className="container mx-auto px-4 max-w-5xl">
            
            <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
              <div className="flex-1 space-y-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-[var(--primary)] text-sm font-bold tracking-wide">SMART BUDGET</div>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-[var(--dark)]">Track every rupee automatically.</h2>
                <p className="text-lg text-gray-600">Set a daily allowance and log expenses in your preferred currency. Get alerts before you overspend so you can travel longer.</p>
                <ul className="space-y-3">
                  {['Offline mode support', 'Auto-currency conversion', 'Categorized spending charts'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-[var(--secondary)]" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full aspect-square bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center p-8">
                <div className="w-full h-full rounded-xl bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center text-gray-400 font-medium">Budget UI Mockup</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse items-center gap-12 mb-24">
              <div className="flex-1 space-y-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-[var(--secondary)] text-sm font-bold tracking-wide">HOSTEL FINDER</div>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-[var(--dark)]">Find stays verified by solo travellers.</h2>
                <p className="text-lg text-gray-600">Skip the generic ratings. We highlight hostels with the best solo-traveller vibe, strong WiFi, and secure lockers.</p>
                <ul className="space-y-3">
                  {['Solo traveller specific ratings', 'Map view with transport overlay', 'Instant booking with Zero hidden fees'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-[var(--secondary)]" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full aspect-square bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center p-8">
                <div className="w-full h-full rounded-xl bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center text-gray-400 font-medium">Hostel Map UI Mockup</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-[var(--info)] text-sm font-bold tracking-wide">TOURIST SAFETY APP</div>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-[var(--dark)]">Digital ID, geo-fencing, and SOS in one flow.</h2>
                <p className="text-lg text-gray-600">Generate a tourist safety pass, start consented location monitoring, receive geo-fence risk alerts, and submit triaged SOS incidents with live coordinates.</p>
                <ul className="space-y-3">
                  {['Digital Tourist ID with emergency profile', 'Geo-fence check-ins for Northeast risk zones', 'AI-style incident severity triage'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-[var(--secondary)]" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                <div className="rounded-2xl border border-gray-200 bg-[#F5F5F3] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase text-gray-500">Safety status</div>
                      <div className="mt-1 text-2xl font-bold text-[var(--dark)]">Active</div>
                    </div>
                    <Radar className="w-8 h-8 text-[var(--secondary)]" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm font-bold">
                    <div className="rounded-xl bg-white p-3">
                      <QrCode className="mx-auto mb-2 h-5 w-5 text-[var(--primary)]" />
                      Digital ID
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <MapIcon className="mx-auto mb-2 h-5 w-5 text-[var(--info)]" />
                      Geofence
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <Siren className="mx-auto mb-2 h-5 w-5 text-red-600" />
                      SOS
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">
                    Entered mountain road advisory zone. Share check-in before continuing.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 bg-white border-t border-gray-200">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-center text-[var(--dark)] mb-16">
              Loved by wanderers worldwide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Sarah J.", country: "UK", text: "The Affordability Engine is crazy accurate. It told me exactly which transport to take in Bangkok to save money." },
                { name: "Rahul M.", country: "India", text: "Found the best hostels with actual solo-traveller vibes. The SOS feature gave my parents so much peace of mind." },
                { name: "Elena V.", country: "Spain", text: "I literally run my entire 6-month backpacking trip through the budget tracker. The offline sync is a lifesaver." },
              ].map((t, i) => (
                <div key={i} className="p-8 rounded-3xl bg-[var(--background)] border border-gray-100 shadow-sm relative">
                  <div className="flex items-center gap-4 mb-6">
                    <img src={`https://i.pravatar.cc/150?img=${i+40}`} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <div className="font-bold text-[var(--dark)]">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.country}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">&quot;{t.text}&quot;</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 bg-[var(--dark)] text-white">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold mb-4">Simple, honest pricing</h2>
              <p className="text-gray-400 text-lg">No hidden fees. Pay once for a trip, or subscribe for unlimited wandering.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-3xl bg-gray-800 p-8 border border-gray-700 flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Backpacker Free</h3>
                <div className="text-4xl font-bold mb-6">₹0<span className="text-xl text-gray-400 font-normal">/forever</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-gray-400" /> 1 Active Trip</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-gray-400" /> Basic Budget Tracking</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-gray-400" /> 5 AI Itinerary generations</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-gray-400" /> Community Access</li>
                </ul>
                <Link href="/register" className="w-full py-4 rounded-xl bg-gray-700 text-center font-bold hover:bg-gray-600 transition-colors">
                  Get Started Free
                </Link>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[#b03a05] p-8 border border-orange-400/50 shadow-2xl shadow-orange-500/20 flex flex-col relative">
                <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Nomad Premium</h3>
                <div className="text-4xl font-bold mb-6 text-white">₹499<span className="text-xl text-orange-200 font-normal">/month</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-orange-50">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> Unlimited Trips</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> Unlimited AI Planning</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> Encrypted Document Vault</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> Offline Map & Directions Cache</li>
                </ul>
                <Link href="/register?plan=premium" className="w-full py-4 rounded-xl bg-white text-[var(--primary)] text-center font-bold hover:bg-gray-50 transition-colors shadow-lg">
                  Upgrade to Premium
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                  <MapIcon className="text-white w-3 h-3" />
                </div>
                <span className="font-[family-name:var(--font-heading)] font-bold text-lg text-[var(--dark)]">
                  SoloWander
                </span>
              </div>
              <p className="text-gray-500 max-w-sm">Travel solo. Spend smart. Stay safe. The ultimate toolkit for the independent traveller.</p>
            </div>
            <div>
              <h4 className="font-bold text-[var(--dark)] mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link href="/features" className="hover:text-[var(--primary)]">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-[var(--primary)]">Pricing</Link></li>
                <li><Link href="/destinations" className="hover:text-[var(--primary)]">Destinations</Link></li>
                <li><Link href="/partners" className="hover:text-[var(--primary)]">Partner with us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[var(--dark)] mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link href="/about" className="hover:text-[var(--primary)]">About Us</Link></li>
                <li><Link href="/privacy" className="hover:text-[var(--primary)]">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[var(--primary)]">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} SoloWander Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {/* Social icons placeholder */}
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">𝕏</div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">📸</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
