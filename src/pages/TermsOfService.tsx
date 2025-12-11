import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and BYC Consulting LLC DBA Riplacer ("Company", "we", "us", or "our") governing your access to and use of the Riplacer website located at <a href="https://www.riplacer.com" className="text-primary hover:underline">https://www.riplacer.com</a> (the "Service").
            </p>
            <p className="mb-4">
              By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access or use the Service.
            </p>
            <p className="mb-4">
              You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="mb-4">
              Riplacer is an AI-powered competitive intelligence platform that helps users identify government accounts using competitor products, provides AI-powered intelligence on why prospects should switch to the user's products, and assists in closing more deals. The Service includes territory mapping, competitor detection, and win strategies generation.
            </p>
            <p className="mb-4">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
            <p className="mb-4">
              To access certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment Terms</h2>
            <p className="mb-4">
              The Service offers both free and paid subscription plans. Paid subscriptions are billed on a recurring basis (monthly or annually) unless cancelled.
            </p>
            <p className="mb-4">
              <strong>Payment Processing:</strong> All payments are processed through Stripe, our third-party payment processor. By making a payment, you agree to Stripe's terms and conditions.
            </p>
            <p className="mb-4">
              <strong>Subscription Renewal:</strong> Paid subscriptions automatically renew at the end of each billing period unless you cancel your subscription before the renewal date.
            </p>
            <p className="mb-4">
              <strong>Price Changes:</strong> We reserve the right to modify subscription fees at any time. We will provide notice of any price changes, and such changes will apply to subsequent billing periods.
            </p>
            <p className="mb-4">
              <strong>Refunds:</strong> All fees paid are non-refundable. Please refer to our Refund Policy for more information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. User Content and Data</h2>
            <p className="mb-4">
              You may upload, submit, or provide content, data, and information ("User Content") through the Service, including but not limited to company information, territory data, competitor information, and notes.
            </p>
            <p className="mb-4">
              <strong>License Grant:</strong> By providing User Content, you grant us a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such User Content in connection with providing and improving the Service. This includes the right to use User Content with third-party AI tools and services to generate reports, analyses, and recommendations.
            </p>
            <p className="mb-4">
              <strong>Ownership:</strong> You retain ownership of your User Content. However, you acknowledge that we may host, store, and use your User Content as necessary to provide the Service. We will not share your User Content with competitors or third parties for competitive purposes, except as necessary to provide the Service or as required by law.
            </p>
            <p className="mb-4">
              <strong>AI-Generated Content:</strong> All AI-generated reports, analyses, recommendations, and other content created by the Service using your User Content or publicly available information ("AI Content") are owned by us. You are granted a limited, non-exclusive, non-transferable license to use AI Content for your internal business purposes only.
            </p>
            <p className="mb-4">
              <strong>No Confidentiality:</strong> You acknowledge and agree that the Service utilizes various AI tools and regularly queries publicly available information. We cannot and do not guarantee that information you share with us will remain confidential or proprietary. You should not share any proprietary, confidential, or sensitive information that you do not want to be processed by AI tools or potentially exposed. By using the Service, you assume all risks associated with sharing information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use</h2>
            <p className="mb-4">
              You agree not to use the Service:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
              <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity</li>
              <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful</li>
              <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
              <li>To use the Service to compete with us or to develop a competing service</li>
            </ul>
            <p className="mb-4">
              Please refer to our Acceptable Use Policy for more detailed guidelines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
            <p className="mb-4">
              The Service and its original content, features, and functionality are owned by BYC Consulting LLC DBA Riplacer and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="mb-4">
              Our trademarks, service marks, and logos may not be used in connection with any product or service without our prior written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
            <p className="mb-4">
              The Service integrates with and uses various third-party services, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Supabase (database and authentication services)</li>
              <li>Mapbox (mapping services)</li>
              <li>OpenAI and other AI service providers (AI analysis and content generation)</li>
              <li>Stripe (payment processing)</li>
            </ul>
            <p className="mb-4">
              Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the practices of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimers</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="mb-4">
              We do not warrant that the Service will be uninterrupted, secure, or error-free, or that defects will be corrected. We do not warrant or make any representations regarding the use or results of the Service in terms of accuracy, reliability, or otherwise.
            </p>
            <p className="mb-4">
              The information provided through the Service, including AI-generated content, is based on publicly available information and AI analysis. We do not guarantee the accuracy, completeness, or timeliness of any information provided.
            </p>
            <p className="mb-4">
              Please refer to our Disclaimer for more detailed information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL BYC CONSULTING LLC DBA RIPLACER, ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
            </p>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIMS UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="mb-4">
              You agree to defend, indemnify, and hold harmless BYC Consulting LLC DBA Riplacer, its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
            </p>
            <p className="mb-4">
              Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so by contacting us at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a> or through your account settings.
            </p>
            <p className="mb-4">
              All provisions of these Terms that by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law and Jurisdiction</h2>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the state and federal courts located in Illinois.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
            </p>
            <p className="mb-4">
              What constitutes a material change will be determined at our sole discretion. By continuing to access or use the Service after any revisions become effective, you agree to be bound by the revised Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service and supersede and replace any prior agreements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms, please contact us at:
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
