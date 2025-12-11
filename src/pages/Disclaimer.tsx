import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Disclaimer() {
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
          <h1 className="text-4xl font-bold mb-2">Disclaimer</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. General Information</h2>
            <p className="mb-4">
              The information on this website and provided through the Riplacer service operated by BYC Consulting LLC DBA Riplacer ("Company", "we", "us", or "our") is for general informational purposes only. While we strive to provide accurate and up-to-date information, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information, products, services, or related graphics contained on the website or provided through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. No Warranties</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Implied warranties of merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Accuracy, completeness, or timeliness of information</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security or freedom from viruses or other harmful components</li>
            </ul>
            <p className="mb-4">
              We do not warrant that the Service will meet your requirements, be available on an uninterrupted, timely, secure, or error-free basis, or be accurate, reliable, free of viruses or other harmful code, complete, legal, or safe.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Accuracy of Information</h2>
            <p className="mb-4">
              The information provided through the Service, including AI-generated reports, analyses, recommendations, and competitive intelligence, is based on:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Publicly available information from various sources</li>
              <li>AI analysis and processing of data</li>
              <li>User-provided information</li>
            </ul>
            <p className="mb-4">
              We do not guarantee the accuracy, completeness, timeliness, or reliability of any information provided through the Service. Information may be outdated, incomplete, or contain errors. You should independently verify any information before relying on it for business decisions.
            </p>
            <p className="mb-4">
              The Service regularly queries publicly available information, and we cannot guarantee that such information is current, accurate, or complete. Public records and databases may contain errors, omissions, or outdated information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. AI-Generated Content</h2>
            <p className="mb-4">
              The Service utilizes artificial intelligence and machine learning technologies to generate reports, analyses, recommendations, and other content. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>AI-generated content may contain errors, inaccuracies, or biases</li>
              <li>AI-generated content is not a substitute for professional advice or judgment</li>
              <li>You should not rely solely on AI-generated content for important business decisions</li>
              <li>We are not responsible for any decisions made based on AI-generated content</li>
              <li>AI-generated content may not reflect current or accurate information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. No Professional Advice</h2>
            <p className="mb-4">
              The information provided through the Service does not constitute professional, legal, financial, tax, or business advice. You should consult with qualified professionals for advice tailored to your specific situation.
            </p>
            <p className="mb-4">
              We are not a law firm, accounting firm, or financial advisor. Nothing in the Service should be construed as legal, financial, tax, or professional advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Business Decisions and Results</h2>
            <p className="mb-4">
              You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Any business decisions you make based on information from the Service are made at your own risk</li>
              <li>We do not guarantee any specific results or outcomes from using the Service</li>
              <li>Past performance or results do not guarantee future success</li>
              <li>We are not responsible for any losses, damages, or negative consequences resulting from your use of the Service</li>
              <li>The Service is a tool to assist you, but you are solely responsible for your business decisions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Information and Links</h2>
            <p className="mb-4">
              The Service may contain links to third-party websites, services, or resources. We are not responsible for the content, accuracy, or opinions expressed on such websites, and such websites are not investigated, monitored, or checked for accuracy or completeness by us.
            </p>
            <p className="mb-4">
              Inclusion of any linked website does not imply approval or endorsement by us. If you decide to access any third-party websites linked to the Service, you do so at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL BYC CONSULTING LLC DBA RIPLACER, ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Loss of profits, goodwill, use, data, or other intangible losses</li>
              <li>Business interruption</li>
              <li>Loss of business opportunities</li>
              <li>Errors or omissions in content</li>
              <li>Decisions made based on information from the Service</li>
            </ul>
            <p className="mb-4">
              ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY.
            </p>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. No Guarantee of Results</h2>
            <p className="mb-4">
              We make no guarantees, representations, or warranties regarding:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>The number of prospects or leads you will identify</li>
              <li>The success rate of your sales efforts</li>
              <li>The accuracy of competitor information</li>
              <li>The effectiveness of AI-generated strategies or recommendations</li>
              <li>Any specific business outcomes or results</li>
            </ul>
            <p className="mb-4">
              Your use of the Service does not guarantee any specific results, and results may vary based on numerous factors beyond our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Service</h2>
            <p className="mb-4">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, at our sole discretion. We are not liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Acknowledgment</h2>
            <p className="mb-4">
              BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THIS DISCLAIMER, UNDERSTAND IT, AND AGREE TO BE BOUND BY ITS TERMS. YOU FURTHER ACKNOWLEDGE THAT YOU ARE USING THE SERVICE AT YOUR OWN RISK.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about this Disclaimer, please contact us at:
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
