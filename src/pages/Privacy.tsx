import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Last Updated: November 1, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="pt-6">
            <p className="text-base leading-relaxed mb-4">
              At Sparkl Wishes, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our wishlist platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
            </p>
            <p className="text-base leading-relaxed">
              We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Personal Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Register for an account</li>
                <li>Create a wishlist</li>
                <li>Claim a gift</li>
                <li>Make a payment</li>
                <li>Contact us for support</li>
                <li>Leave comments or messages</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                This information may include:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
                <li><strong>Profile Information:</strong> Avatar/profile photo, display name, bio</li>
                <li><strong>Wishlist Information:</strong> Wishlist titles, descriptions, item names, prices, images, links</li>
                <li><strong>Payment Information:</strong> Payment details are processed securely by Paystack (we do NOT store card numbers)</li>
                <li><strong>Communication Information:</strong> Messages, comments, thank you notes, guest book entries</li>
                <li><strong>Contact Information:</strong> Phone numbers, addresses (if provided for delivery purposes)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Automatically Collected Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                When you access our platform, we automatically collect certain information about your device and usage:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Usage Information:</strong> Pages viewed, time spent, clicks, navigation patterns</li>
                <li><strong>Location Information:</strong> General geographic location based on IP address (for currency detection)</li>
                <li><strong>Cookies:</strong> We use cookies and similar technologies to enhance your experience (see Cookies section)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Information from Third Parties</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may receive information from third-party services you use to access our platform:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>Authentication Providers:</strong> If you sign up using social login, we receive basic profile information</li>
                <li><strong>Payment Processors:</strong> Paystack provides transaction status and payment references</li>
                <li><strong>Analytics Services:</strong> Aggregated usage data from analytics tools</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Provide Services:</strong> Create and manage your account, wishlists, and transactions</li>
              <li><strong>Process Payments:</strong> Facilitate payments between gift givers and wishlist owners</li>
              <li><strong>Communication:</strong> Send transactional emails (payment confirmations, thank you messages, notifications)</li>
              <li><strong>Improve Platform:</strong> Analyze usage patterns to enhance features and user experience</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Customer Support:</strong> Respond to inquiries and provide technical assistance</li>
              <li><strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal processes</li>
              <li><strong>Marketing:</strong> Send promotional emails (you can opt-out anytime)</li>
              <li><strong>Personalization:</strong> Customize your experience based on preferences</li>
            </ul>
          </CardContent>
        </Card>

        {/* How We Share Your Information */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              How We Share Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              We do NOT sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Public Wishlists:</strong> Information you choose to make public (wishlist titles, items, descriptions) is visible to anyone with the link</li>
              <li><strong>Gift Givers:</strong> When someone claims an item, the wishlist owner may see the claimer's name and message (unless anonymous)</li>
              <li><strong>Service Providers:</strong> We share data with trusted third parties who help us operate:
                <ul className="list-circle list-inside ml-6 mt-1">
                  <li>Supabase (database and authentication)</li>
                  <li>Paystack (payment processing)</li>
                  <li>Vercel (hosting)</li>
                  <li>Analytics providers (anonymized data)</li>
                </ul>
              </li>
              <li><strong>Business Transfers:</strong> If we merge, are acquired, or sell assets, your information may be transferred</li>
              <li><strong>Legal Requirements:</strong> We may disclose information to comply with laws, court orders, or legal processes</li>
              <li><strong>Safety & Security:</strong> We may share information to protect rights, property, safety of users or the public</li>
              <li><strong>With Your Consent:</strong> We may share information for other purposes with your explicit consent</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using SSL/TLS</li>
              <li><strong>Password Security:</strong> Passwords are hashed and salted using industry-standard algorithms</li>
              <li><strong>Payment Security:</strong> We use Paystack, a PCI-DSS compliant payment processor. We never store card details</li>
              <li><strong>Access Controls:</strong> Only authorized personnel have access to personal data</li>
              <li><strong>Regular Audits:</strong> We conduct security reviews and vulnerability assessments</li>
              <li><strong>Data Backups:</strong> Regular backups to prevent data loss</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
              <strong>⚠️ Important:</strong> While we take security seriously, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </CardContent>
        </Card>

        {/* Your Privacy Rights */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              Your Privacy Rights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information through your profile settings</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data (some data may be retained for legal compliance)</li>
              <li><strong>Data Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails (transactional emails will still be sent)</li>
              <li><strong>Object:</strong> Object to certain processing activities</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was the legal basis</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at <strong className="text-purple-600">privacy@sparklwishes.com</strong>. We will respond within 30 days.
            </p>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>Essential Cookies:</strong> Required for the platform to function (authentication, session management)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can control cookies through your browser settings. Note that disabling essential cookies may affect platform functionality.
            </p>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our platform is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected information from a child under 13, please contact us immediately at <strong className="text-purple-600">privacy@sparklwishes.com</strong>, and we will delete the information promptly.
            </p>
          </CardContent>
        </Card>

        {/* International Users */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our platform, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure your data is protected in accordance with this Privacy Policy.
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>Active Accounts:</strong> Retained while your account is active</li>
              <li><strong>Closed Accounts:</strong> Deleted within 90 days of account closure (unless legal retention required)</li>
              <li><strong>Transaction Records:</strong> Retained for 7 years for tax and legal compliance</li>
              <li><strong>Anonymized Data:</strong> May be retained indefinitely for analytics</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact Us */}
        <Card className="mb-6 shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> <a href="mailto:privacy@sparklwishes.com" className="text-purple-600 hover:underline">privacy@sparklwishes.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@sparklwishes.com" className="text-purple-600 hover:underline">support@sparklwishes.com</a></p>
              <p><strong>Address:</strong> [Your Company Address]</p>
            </div>
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

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-md mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Sparkl Wishes. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-4">
              <button className="hover:text-purple-600" onClick={() => navigate("/")}>
                Home
              </button>
              <button className="hover:text-purple-600" onClick={() => navigate("/how-it-works")}>
                How It Works
              </button>
              <button className="hover:text-purple-600" onClick={() => navigate("/privacy")}>
                Privacy
              </button>
              <button className="hover:text-purple-600" onClick={() => navigate("/terms")}>
                Terms
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;

