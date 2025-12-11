import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              BYC Consulting LLC DBA Riplacer ("Company", "we", "us", or "our") operates the website <a href="https://www.riplacer.com" className="text-primary hover:underline">https://www.riplacer.com</a> (the "Service"). This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
            <p className="mb-4">
              We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Information You Provide to Us</h3>
            <p className="mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password, and other registration information</li>
              <li><strong>Profile Information:</strong> Company name, industry, business information, and other profile details</li>
              <li><strong>Territory and Location Data:</strong> Geographic boundaries, states, cities, regions, and territory definitions</li>
              <li><strong>Target Information:</strong> Government accounts, prospects, competitors, and related business intelligence</li>
              <li><strong>User Content:</strong> Notes, comments, tags, favorites, and other content you create or upload</li>
              <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely through Stripe)</li>
              <li><strong>Communication Data:</strong> Correspondence with us, feedback, and support requests</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Information Automatically Collected</h3>
            <p className="mb-4">When you use the Service, we automatically collect certain information, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns, and navigation paths</li>
              <li><strong>Device Information:</strong> IP address, browser type and version, device type, operating system, and device identifiers</li>
              <li><strong>Location Data:</strong> General location information derived from your IP address</li>
              <li><strong>Cookies and Tracking Technologies:</strong> See our Cookie Policy for more information</li>
              <li><strong>Log Data:</strong> Server logs, error reports, and performance data</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Information from Third Parties</h3>
            <p className="mb-4">We may receive information about you from third-party services:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Authentication Providers:</strong> If you sign in using Google OAuth or other third-party authentication</li>
              <li><strong>Public Records:</strong> We regularly query publicly available information from government databases, public records, and other publicly accessible sources</li>
              <li><strong>Payment Processors:</strong> Transaction information from Stripe</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect for various purposes, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process your registration and manage your account</li>
              <li>To process payments and manage subscriptions</li>
              <li>To generate AI-powered reports, analyses, and recommendations using your data and publicly available information</li>
              <li>To provide customer support and respond to your inquiries</li>
              <li>To send you service-related communications, updates, and notifications</li>
              <li>To detect, prevent, and address technical issues, fraud, or security threats</li>
              <li>To comply with legal obligations and enforce our Terms of Service</li>
              <li>To analyze usage patterns and improve user experience</li>
              <li>To develop new features and functionality</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Processing and AI Tools</h2>
            <p className="mb-4">
              <strong>Important:</strong> The Service utilizes various third-party AI tools and services to analyze your data and generate reports, recommendations, and other content. By using the Service, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your User Content will be processed by AI tools and services, which may include sending your data to third-party AI providers</li>
              <li>We regularly query publicly available information from various sources to enhance our Service</li>
              <li>We cannot guarantee that information you share with us will remain confidential or proprietary</li>
              <li>You should not share any proprietary, confidential, or sensitive information that you do not want to be processed by AI tools or potentially exposed</li>
              <li>By using the Service, you assume all risks associated with sharing information</li>
            </ul>
            <p className="mb-4">
              We use AI tools to provide you with competitive intelligence, prospect analysis, and displacement strategies. This processing is essential to the core functionality of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Information Sharing and Disclosure</h2>
            <p className="mb-4">We may share your information in the following circumstances:</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Service Providers</h3>
            <p className="mb-4">We share information with third-party service providers who perform services on our behalf, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Supabase:</strong> Database hosting, authentication, and backend infrastructure</li>
              <li><strong>Mapbox:</strong> Mapping and geolocation services</li>
              <li><strong>AI Service Providers:</strong> OpenAI and other AI providers for content generation and analysis</li>
              <li><strong>Stripe:</strong> Payment processing and billing</li>
              <li><strong>Analytics Providers:</strong> Service usage analytics and performance monitoring</li>
            </ul>
            <p className="mb-4">These service providers are contractually obligated to protect your information and use it only for the purposes we specify.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Business Transfers</h3>
            <p className="mb-4">If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Legal Requirements</h3>
            <p className="mb-4">We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.4 Protection of Rights</h3>
            <p className="mb-4">We may disclose your information to protect and defend our rights or property, prevent or investigate possible wrongdoing, protect the personal safety of users, or protect against legal liability.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.5 With Your Consent</h3>
            <p className="mb-4">We may share your information with your consent or at your direction.</p>

            <p className="mb-4">
              <strong>We do not sell your personal information to third parties.</strong> We do not share your User Content with competitors for competitive purposes, except as necessary to provide the Service or as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="mb-4">
              We retain your personal information and User Content permanently unless you request deletion or unless we are required to delete it by law.
            </p>
            <p className="mb-4">
              You may request deletion of your data at any time by contacting us at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a> or through your account settings. Upon receiving a valid deletion request, we will delete your personal information and User Content within a reasonable timeframe, subject to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Our legal obligations to retain certain information</li>
              <li>Our need to resolve disputes and enforce our agreements</li>
              <li>Technical limitations that may prevent immediate deletion</li>
            </ul>
            <p className="mb-4">
              Even after deletion, some information may remain in backup systems for a period of time, and we may retain anonymized or aggregated data that cannot be used to identify you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
            <p className="mb-4">You have certain rights regarding your personal information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Access:</strong> You can access and update your account information through your account settings</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and personal information</li>
              <li><strong>Correction:</strong> You can update or correct your information through your account settings</li>
              <li><strong>Opt-Out:</strong> You can opt out of marketing communications by following the unsubscribe instructions in our emails</li>
              <li><strong>Account Closure:</strong> You can close your account at any time through your account settings</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, please contact us at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to track activity on our Service and store certain information. For detailed information about the cookies we use and your choices regarding cookies, please see our Cookie Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="mb-4">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. International Users</h2>
            <p className="mb-4">
              Our Service is intended for users located in the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where our servers are located and our central database is operated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
            <p className="mb-4">
              You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
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
