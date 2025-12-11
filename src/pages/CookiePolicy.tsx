import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="mb-4">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. Cookies are widely used to make websites work more efficiently and to provide information to the website owners.
            </p>
            <p className="mb-4">
              Cookies allow a website to recognize your device and store some information about your preferences or past actions. This helps us provide you with a better experience when you browse our Service and allows us to improve our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="mb-4">We use cookies for various purposes, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> These cookies are necessary for the Service to function properly. They enable core functionality such as security, network management, and accessibility.</li>
              <li><strong>Authentication Cookies:</strong> These cookies help us authenticate you and keep you logged in when you return to the Service.</li>
              <li><strong>Preference Cookies:</strong> These cookies remember your preferences and settings to provide a personalized experience.</li>
              <li><strong>Analytics Cookies:</strong> These cookies help us understand how visitors interact with our Service by collecting and reporting information anonymously.</li>
              <li><strong>Performance Cookies:</strong> These cookies collect information about how you use our Service to help us improve its performance.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Strictly Necessary Cookies</h3>
            <p className="mb-4">
              These cookies are essential for you to browse the Service and use its features. Without these cookies, services you have asked for cannot be provided. These cookies do not store any personally identifiable information.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Functionality Cookies</h3>
            <p className="mb-4">
              These cookies allow the Service to remember choices you make (such as your username, language, or region) and provide enhanced, more personalized features. These cookies may also be used to remember changes you have made to text size, fonts, and other parts of web pages that you can customize.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Performance and Analytics Cookies</h3>
            <p className="mb-4">
              These cookies collect information about how you use the Service, such as which pages you visit most often and if you get error messages from web pages. These cookies don't collect information that identifies you. All information these cookies collect is aggregated and therefore anonymous.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Third-Party Cookies</h3>
            <p className="mb-4">
              In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service, deliver advertisements, and so on. These third-party cookies include:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Supabase:</strong> Authentication and session management cookies</li>
              <li><strong>Analytics Providers:</strong> Cookies used for analytics and performance monitoring</li>
              <li><strong>Mapbox:</strong> Cookies used for mapping functionality</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="mb-4">
              Most web browsers allow you to control cookies through their settings preferences. However, limiting cookies may impact your ability to use the Service. You can set your browser to refuse cookies or alert you when cookies are being sent.
            </p>
            <p className="mb-4">Here are links to the cookie settings for popular browsers:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
            </ul>
            <p className="mb-4">
              Please note that if you disable cookies, some features of the Service may not function properly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Do Not Track Signals</h2>
            <p className="mb-4">
              Some browsers include a "Do Not Track" (DNT) feature that signals to websites you visit that you do not want to have your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted. As a result, our Service does not currently respond to DNT signals.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Changes to This Cookie Policy</h2>
            <p className="mb-4">
              We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last Updated" date.
            </p>
            <p className="mb-4">
              You are advised to review this Cookie Policy periodically for any changes. Changes to this Cookie Policy are effective when they are posted on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Cookie Policy, please contact us at:
            </p>
            <p className="mb-4">
              <strong>BYC Consulting LLC DBA Riplacer</strong><br />
              100 Park Avenue<br />
              Fort Lee, NJ 07024<br />
              Email: <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
