import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, Scale, CreditCard, Shield, Ban } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground">
            Last Updated: November 1, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="pt-6">
            <p className="text-base leading-relaxed mb-4">
              Welcome to Sparkl Wishes! These Terms of Service ("Terms") govern your access to and use of our wishlist platform, including our website, mobile applications, and related services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ IMPORTANT</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Please read these Terms carefully before using the Service. If you do not agree to these Terms, you may not access or use the Service. By creating an account or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              1. Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              By accessing or using Sparkl Wishes, you agree to these Terms and our Privacy Policy. These Terms constitute a legally binding agreement between you and Sparkl Wishes ("we," "us," or "our").
            </p>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page with a new "Last Updated" date. Your continued use of the Service after such changes constitutes acceptance of the updated Terms.
            </p>
            <p>
              You must be at least 13 years old to use this Service. If you are under 18, you must have parental or guardian consent.
            </p>
          </CardContent>
        </Card>

        {/* Account Registration */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              2. Account Registration and Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>2.1 Account Creation:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You must provide accurate, current, and complete information during registration</li>
              <li>You must maintain and promptly update your account information</li>
              <li>You may not create an account using false information or impersonate another person</li>
              <li>You may only create one account per email address</li>
            </ul>

            <p><strong>2.2 Account Security:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized access or security breach</li>
              <li>We are not liable for any loss or damage arising from your failure to protect your account</li>
            </ul>

            <p><strong>2.3 Account Termination:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You may close your account at any time through your profile settings</li>
              <li>We may suspend or terminate your account for violations of these Terms</li>
              <li>Upon termination, your right to use the Service ceases immediately</li>
              <li>Some data may be retained for legal and compliance purposes</li>
            </ul>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>3. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Sparkl Wishes provides a platform for users to:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Create and manage digital wishlists for various occasions</li>
              <li>Share wishlists with friends, family, and the public</li>
              <li>Allow others to claim and purchase items from wishlists</li>
              <li>Process payments for claimed items</li>
              <li>Manage funds through a secure digital wallet</li>
              <li>Communicate through comments, messages, and thank you notes</li>
              <li>Participate in group gifting and cash fund contributions</li>
            </ul>
            <p className="mt-3">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice.
            </p>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              4. User Responsibilities and Conduct
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>4.1 Prohibited Activities:</strong></p>
            <p>You agree NOT to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Post fraudulent, misleading, or deceptive content</li>
              <li>Harass, abuse, threaten, or intimidate other users</li>
              <li>Upload viruses, malware, or malicious code</li>
              <li>Scrape, crawl, or use automated tools to access the Service</li>
              <li>Reverse engineer, decompile, or hack the Service</li>
              <li>Create fake accounts or engage in fraudulent activity</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Collect or store personal data of other users without consent</li>
              <li>Use the Service for commercial purposes without authorization</li>
            </ul>

            <p><strong>4.2 Content Guidelines:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Content must not be offensive, obscene, or inappropriate</li>
              <li>Content must not infringe on intellectual property rights</li>
              <li>Content must not contain spam or advertising (unless authorized)</li>
              <li>Content must comply with all applicable laws</li>
            </ul>

            <p><strong>4.3 Consequences of Violations:</strong></p>
            <p>
              Violations of these Terms may result in:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Content removal</li>
              <li>Account suspension or termination</li>
              <li>Legal action and liability for damages</li>
              <li>Reporting to law enforcement</li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              5. Payment Terms and Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>5.1 Platform Fees:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Free Users:</strong> 4.5% platform fee on all successful payments</li>
              <li><strong>Premium Users:</strong> Reduced fees as per your subscription plan</li>
              <li>Fees are deducted automatically from each transaction</li>
              <li>Payment processing fees (Paystack) are separate and additional</li>
            </ul>

            <p><strong>5.2 Payment Processing:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>All payments are processed securely through Paystack</li>
              <li>We do not store credit card information</li>
              <li>You are responsible for all charges made through your account</li>
              <li>Payments are final and non-refundable except as required by law</li>
            </ul>

            <p><strong>5.3 Wallet and Withdrawals:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Funds received from gifts are credited to your wallet immediately</li>
              <li>You may withdraw funds to your bank account via Paystack</li>
              <li>Withdrawals are processed within 1-3 business days</li>
              <li>Minimum withdrawal amount and fees may apply</li>
              <li>We reserve the right to hold funds if fraud or disputes are suspected</li>
            </ul>

            <p><strong>5.4 Refunds and Disputes:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Refunds are at the discretion of the wishlist owner</li>
              <li>Platform fees are non-refundable</li>
              <li>Payment disputes should be resolved between gift giver and wishlist owner</li>
              <li>We may facilitate dispute resolution but are not responsible for outcomes</li>
            </ul>

            <p><strong>5.5 Premium Subscriptions:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Premium plans are billed monthly or annually</li>
              <li>Subscriptions auto-renew unless cancelled</li>
              <li>You may cancel anytime; no refunds for partial months</li>
              <li>Pricing is subject to change with 30 days' notice</li>
            </ul>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>6. Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>6.1 Our Content:</strong></p>
            <p>
              The Service and its original content, features, and functionality are owned by Sparkl Wishes and protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without express written permission.
            </p>

            <p><strong>6.2 Your Content:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You retain ownership of content you create (wishlists, items, descriptions, images)</li>
              <li>By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content on the Service</li>
              <li>You represent that you have rights to all content you upload</li>
              <li>You are responsible for ensuring your content doesn't infringe on third-party rights</li>
            </ul>

            <p><strong>6.3 DMCA and Copyright Infringement:</strong></p>
            <p>
              If you believe your copyright has been infringed, please contact us at <strong className="text-purple-600">dmca@sparklwishes.com</strong> with:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Description of the copyrighted work</li>
              <li>Location of the infringing content</li>
              <li>Your contact information</li>
              <li>Statement of good faith belief</li>
              <li>Statement of accuracy under penalty of perjury</li>
              <li>Physical or electronic signature</li>
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-purple-600" />
              7. Disclaimers and Limitations of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>7.1 Service "As Is":</strong></p>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <p><strong>7.2 No Guarantees:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>We do not guarantee the Service will be uninterrupted, secure, or error-free</li>
              <li>We do not guarantee the accuracy or reliability of information on the Service</li>
              <li>We do not guarantee that gifts will be purchased or funds will be received</li>
              <li>We are not responsible for disputes between users</li>
            </ul>

            <p><strong>7.3 Limitation of Liability:</strong></p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPARKL WISHES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p>
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE LAST 12 MONTHS, OR ₦10,000, WHICHEVER IS GREATER.
            </p>

            <p><strong>7.4 Third-Party Services:</strong></p>
            <p>
              The Service may contain links to third-party websites or services (e.g., Paystack, product retailers). We are not responsible for the content, policies, or practices of third parties. Your use of third-party services is at your own risk.
            </p>
          </CardContent>
        </Card>

        {/* Indemnification */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              8. Indemnification
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              You agree to indemnify, defend, and hold harmless Sparkl Wishes, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including attorney fees) arising from:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your content or conduct on the Service</li>
              <li>Any fraud or illegal activity associated with your account</li>
            </ul>
          </CardContent>
        </Card>

        {/* Dispute Resolution */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>9. Dispute Resolution and Arbitration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>9.1 Informal Resolution:</strong></p>
            <p>
              Before filing a claim, you agree to contact us at <strong className="text-purple-600">legal@sparklwishes.com</strong> to seek informal resolution. We will attempt to resolve disputes within 30 days.
            </p>

            <p><strong>9.2 Governing Law:</strong></p>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Nigeria, without regard to conflict of law principles.
            </p>

            <p><strong>9.3 Jurisdiction:</strong></p>
            <p>
              Any disputes arising from these Terms or the Service shall be resolved in the courts of Nigeria. You consent to the exclusive jurisdiction of these courts.
            </p>

            <p><strong>9.4 Class Action Waiver:</strong></p>
            <p>
              You agree to resolve disputes individually and waive any right to participate in class actions or class arbitrations.
            </p>
          </CardContent>
        </Card>

        {/* Miscellaneous */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>10. Miscellaneous Provisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>10.1 Entire Agreement:</strong></p>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Sparkl Wishes regarding the Service.
            </p>

            <p><strong>10.2 Severability:</strong></p>
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
            </p>

            <p><strong>10.3 Waiver:</strong></p>
            <p>
              Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.
            </p>

            <p><strong>10.4 Assignment:</strong></p>
            <p>
              You may not assign or transfer these Terms without our written consent. We may assign these Terms without restriction.
            </p>

            <p><strong>10.5 Force Majeure:</strong></p>
            <p>
              We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control (e.g., natural disasters, war, pandemics, government actions).
            </p>

            <p><strong>10.6 Survival:</strong></p>
            <p>
              Provisions that by their nature should survive termination shall survive, including but not limited to: ownership, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mb-6 shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle>11. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>General Inquiries:</strong> <a href="mailto:support@sparklwishes.com" className="text-purple-600 hover:underline">support@sparklwishes.com</a></p>
              <p><strong>Legal:</strong> <a href="mailto:legal@sparklwishes.com" className="text-purple-600 hover:underline">legal@sparklwishes.com</a></p>
              <p><strong>DMCA:</strong> <a href="mailto:dmca@sparklwishes.com" className="text-purple-600 hover:underline">dmca@sparklwishes.com</a></p>
              <p><strong>Address:</strong> [Your Company Address]</p>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <Card className="mb-6 shadow-lg border-0 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800 leading-relaxed font-medium">
              BY USING SPARKL WISHES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            onClick={() => navigate("/auth")}
          >
            Get Started with Sparkl Wishes
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;

