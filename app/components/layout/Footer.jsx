import { Github, Linkedin, Twitter } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#050608] text-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Top: grid with 3 areas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand / official info */}
          <div className="md:col-span-4">
            <a href="/" className="inline-flex items-center gap-3">
              <span className="text-2xl font-extrabold text-white">Probo</span>
            </a>

            <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-md">
              Probo is an AI-driven predictive platform offering real-time
              insights and instant settlements. Trade & bet responsibly — terms
              apply.
            </p>

            <div className="mt-4 text-xs text-gray-400 space-y-1">
              {/* Replace these with your real company details */}
              <div>
                <span className="font-medium text-gray-300">
                  Probo Labs Pvt. Ltd.
                </span>
              </div>
              <div>
                Reg. No: <span className="text-gray-300">12345678</span>
              </div>
              <div>Registered Office: 12 Example Street, Mumbai, India</div>
            </div>
          </div>

          {/* Nav columns (center) */}
          <div className="md:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/features"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/pricing"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/changelog"
                  >
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/about"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/careers"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/blog"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Support</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/docs"
                  >
                    Docs
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/help"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-white transition-colors"
                    href="/contact"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: contact + socials */}
          <div className="md:col-span-3">
            <h4 className="text-sm font-semibold text-white">Contact</h4>
            <p className="text-sm text-gray-400 mt-2">support@probo.com</p>
            <p className="text-sm text-gray-400">+91 • 90000 00000</p>

            <div className="mt-4 flex gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
              >
                <Twitter className="h-4 w-4 text-gray-200" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
              >
                <Github className="h-4 w-4 text-gray-200" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
              >
                <Linkedin className="h-4 w-4 text-gray-200" />
              </a>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <div>
                <strong>Legal</strong>
              </div>
              <div className="mt-2">
                Licensed for entertainment betting. Local laws apply.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: legal row */}
        <div className="mt-8 border-t border-white/6 pt-6 text-xs text-gray-400 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="max-w-lg">
            <p>© {year} Probo Labs Pvt. Ltd. All rights reserved.</p>
            <p className="mt-1 text-gray-400">
              Betting involves risk. If you or someone you know has a gambling
              problem, please seek help.{" "}
              <a className="underline hover:no-underline" href="/responsible">
                Responsible Gambling
              </a>
              .
            </p>
          </div>

          <div className="flex gap-4 flex-wrap">
            <a href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white transition">
              Terms &amp; Conditions
            </a>
            <a href="/aml" className="hover:text-white transition">
              AML Policy
            </a>
            <a href="/status" className="hover:text-white transition">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
