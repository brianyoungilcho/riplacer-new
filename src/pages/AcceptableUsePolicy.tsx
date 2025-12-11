import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AcceptableUsePolicy() {
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
          <h1 className="text-4xl font-bold mb-2">Acceptable Use Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              This Acceptable Use Policy ("Policy") sets forth the terms and conditions for your use of the Riplacer service operated by BYC Consulting LLC DBA Riplacer ("Company", "we", "us", or "our"). This Policy is incorporated by reference into our Terms of Service.
            </p>
            <p className="mb-4">
              By accessing or using the Service, you agree to comply with this Policy. Violation of this Policy may result in suspension or termination of your account and access to the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Prohibited Uses</h2>
            <p className="mb-4">You agree not to use the Service:</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Illegal Activities</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
              <li>To engage in any illegal or fraudulent activity</li>
              <li>To violate any intellectual property rights or proprietary rights of others</li>
              <li>To violate any privacy rights of others</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Harmful or Malicious Activities</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To transmit, or procure the sending of, any spam, unsolicited advertising, or promotional material</li>
              <li>To transmit any data, send or upload any material that contains viruses, Trojan horses, worms, time-bombs, keystroke loggers, spyware, adware, or any other harmful programs or similar computer code designed to adversely affect the operation of any computer software or hardware</li>
              <li>To engage in any activity that could harm, disable, overburden, or impair the Service or interfere with any other party's use of the Service</li>
              <li>To attempt to gain unauthorized access to the Service, other accounts, computer systems, or networks connected to the Service</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Impersonation and Misrepresentation</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity</li>
              <li>To misrepresent your identity or affiliation with any person or organization</li>
              <li>To use false or misleading information in your account or profile</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Harassment and Abuse</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To harass, abuse, or harm another person</li>
              <li>To transmit any content that is defamatory, libelous, obscene, pornographic, abusive, offensive, or otherwise objectionable</li>
              <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.5 Competitive Activities</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To use the Service to compete with us or to develop a competing service</li>
              <li>To reverse engineer, decompile, or disassemble any aspect of the Service</li>
              <li>To scrape, crawl, or use automated means to access or collect data from the Service without our express written permission</li>
              <li>To use the Service to build a similar or competitive product or service</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.6 Data Misuse</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To collect or store personal data about other users without their express permission</li>
              <li>To use the Service to collect, store, or process personal information in violation of applicable privacy laws</li>
              <li>To share your account credentials with others or allow others to access your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.7 System Abuse</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To use the Service in a manner that could damage, disable, overburden, or impair our servers or networks</li>
              <li>To attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service</li>
              <li>To use any robot, spider, scraper, or other automated means to access the Service for any purpose without our express written permission</li>
              <li>To take any action that imposes an unreasonable or disproportionately large load on our infrastructure</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Content Standards</h2>
            <p className="mb-4">You agree that any content you submit, upload, or provide through the Service:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Will not violate any third-party rights, including intellectual property, privacy, or publicity rights</li>
              <li>Will not contain false, misleading, or deceptive information</li>
              <li>Will not contain confidential or proprietary information that you do not have the right to share</li>
              <li>Will comply with all applicable laws and regulations</li>
              <li>Will not be harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Monitoring and Enforcement</h2>
            <p className="mb-4">
              We reserve the right, but are not obligated, to monitor your use of the Service to ensure compliance with this Policy and our Terms of Service. We may:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Review, edit, or remove any content that violates this Policy</li>
              <li>Suspend or terminate your account and access to the Service</li>
              <li>Take legal action against you for violations</li>
              <li>Report violations to law enforcement authorities</li>
            </ul>
            <p className="mb-4">
              We have no obligation to monitor or enforce this Policy, but we reserve the right to do so at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Consequences of Violation</h2>
            <p className="mb-4">
              Violation of this Policy may result in:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Immediate suspension or termination of your account</li>
              <li>Removal of content that violates this Policy</li>
              <li>Legal action, including seeking damages</li>
              <li>Reporting to law enforcement authorities</li>
            </ul>
            <p className="mb-4">
              We reserve the right to take any action we deem necessary to enforce this Policy and protect the Service and its users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Reporting Violations</h2>
            <p className="mb-4">
              If you become aware of any violation of this Policy, please report it to us immediately at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a>.
            </p>
            <p className="mb-4">
              When reporting a violation, please provide as much detail as possible, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Description of the violation</li>
              <li>Location of the violation (URL, username, etc.)</li>
              <li>Any relevant screenshots or evidence</li>
              <li>Your contact information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Changes to This Policy</h2>
            <p className="mb-4">
              We may modify this Policy at any time at our sole discretion. We will notify you of any material changes by posting the updated Policy on this page and updating the "Last Updated" date.
            </p>
            <p className="mb-4">
              Your continued use of the Service after any changes to this Policy constitutes your acceptance of the modified Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about this Acceptable Use Policy, please contact us at:
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
