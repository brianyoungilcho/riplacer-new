import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RefundPolicy() {
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
          <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. General Policy</h2>
            <p className="mb-4">
              BYC Consulting LLC DBA Riplacer ("Company", "we", "us", or "our") operates a strict no-refund policy for all paid subscriptions and services. All fees paid for the Riplacer service are non-refundable.
            </p>
            <p className="mb-4">
              By purchasing a subscription or making any payment for the Service, you acknowledge that you have read, understood, and agree to this Refund Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. No Refunds</h2>
            <p className="mb-4">
              We do not provide refunds for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Monthly or annual subscription fees</li>
              <li>One-time payments or fees</li>
              <li>Upgrades or downgrades to subscription plans</li>
              <li>Partial periods of unused subscription time</li>
              <li>Services already rendered or accessed</li>
              <li>Any fees paid for the Service, regardless of the reason</li>
            </ul>
            <p className="mb-4">
              This policy applies regardless of:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Whether you have used the Service or not</li>
              <li>Whether you are satisfied with the Service</li>
              <li>Whether you have technical issues or difficulties</li>
              <li>Whether you cancel your subscription</li>
              <li>Any other circumstances</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Subscription Cancellation</h2>
            <p className="mb-4">
              You may cancel your subscription at any time through your account settings or by contacting us at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a>.
            </p>
            <p className="mb-4">
              <strong>Important:</strong> Cancelling your subscription will stop future billing cycles, but you will not receive a refund for any fees already paid, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Fees for the current billing period</li>
              <li>Fees for any previous billing periods</li>
              <li>Any unused portion of your subscription</li>
            </ul>
            <p className="mb-4">
              Your subscription will remain active until the end of the current billing period, after which your access to paid features will be terminated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Free Trial Period</h2>
            <p className="mb-4">
              If we offer a free trial period, you will not be charged during the trial period. If you do not cancel before the end of the trial period, you will be charged for the subscription, and this Refund Policy will apply.
            </p>
            <p className="mb-4">
              We reserve the right to modify or discontinue free trial offers at any time without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Payment Processing</h2>
            <p className="mb-4">
              All payments are processed through Stripe, our third-party payment processor. Any disputes or chargebacks should be directed to Stripe in accordance with their terms and conditions.
            </p>
            <p className="mb-4">
              If you believe there has been an error in billing, please contact us at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a> within 30 days of the charge. We will investigate and, if we determine an error occurred, we will correct it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Account Termination</h2>
            <p className="mb-4">
              If we terminate your account for violation of our Terms of Service or Acceptable Use Policy, you will not be entitled to any refund.
            </p>
            <p className="mb-4">
              If you terminate your account, this Refund Policy applies, and no refunds will be provided.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Service Modifications</h2>
            <p className="mb-4">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time. Such modifications, suspensions, or discontinuations do not entitle you to a refund.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Exceptions</h2>
            <p className="mb-4">
              This Refund Policy applies in all circumstances. There are no exceptions to this policy, except as required by applicable law.
            </p>
            <p className="mb-4">
              If you believe you are entitled to a refund under applicable law, you must contact us at <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a> with a detailed explanation and supporting documentation. We will review your request in accordance with applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Contact for Billing Issues</h2>
            <p className="mb-4">
              If you have questions about billing or need assistance with your account, please contact us at:
            </p>
            <p className="mb-4">
              <strong>BYC Consulting LLC DBA Riplacer</strong><br />
              100 Park Avenue<br />
              Fort Lee, NJ 07024<br />
              Email: <a href="mailto:team@riplacer.com" className="text-primary hover:underline">team@riplacer.com</a>
            </p>
            <p className="mb-4">
              We will respond to your inquiry within a reasonable timeframe.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="mb-4">
              We reserve the right to modify this Refund Policy at any time. Any changes will be posted on this page with an updated "Last Updated" date. Your continued use of the Service after any changes constitutes your acceptance of the modified Refund Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Acknowledgment</h2>
            <p className="mb-4">
              BY MAKING A PAYMENT OR PURCHASING A SUBSCRIPTION, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THIS REFUND POLICY. YOU FURTHER ACKNOWLEDGE THAT ALL FEES PAID ARE NON-REFUNDABLE.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
