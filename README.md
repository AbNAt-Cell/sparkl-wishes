# Sparkl Wishes 🎁

A beautiful wishlist platform for life's celebrations, featuring secure payments and an integrated wallet system.

## Project info

**URL**: https://lovable.dev/projects/4f1d0f2e-a072-49bc-89d9-512c3358db62

## ✨ Features

- 🎉 Create beautiful wishlists for any celebration (weddings, birthdays, etc.)
- 💳 Secure payment processing via Paystack
- 💰 Built-in wallet system for wishlist owners
- 📱 Mobile-responsive design
- 🔒 Anonymous gifting option
- 📊 Transaction history tracking
- 💸 Easy withdrawals to bank accounts
- 🌍 Multi-currency support

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4f1d0f2e-a072-49bc-89d9-512c3358db62) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables (see below)
cp .env.example .env
# Edit .env with your actual API keys

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
```

**Getting API Keys:**
- Supabase: https://supabase.com/dashboard
- Paystack: https://dashboard.paystack.com/#/settings/developers

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Paystack
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4f1d0f2e-a072-49bc-89d9-512c3358db62) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 💰 Wallet Feature

Sparkl Wishes includes a complete wallet system for wishlist owners:

- **Automatic Balance Updates**: When someone pays for an item, funds are automatically added to your wallet
- **Transaction History**: Track all payments received
- **Easy Withdrawals**: Withdraw funds directly to your Nigerian bank account
- **Multi-Currency**: Support for multiple currencies (NGN, USD, GBP, EUR, etc.)

For detailed documentation on the wallet feature, see [WALLET_FEATURE.md](./WALLET_FEATURE.md)

## 📚 Additional Documentation

- [AUDIT_REPORT.md](./AUDIT_REPORT.md) - Comprehensive codebase audit and improvement plan
- [WALLET_FEATURE.md](./WALLET_FEATURE.md) - Wallet system documentation

## 🤝 Contributing

Contributions are welcome! Please ensure all tests pass and linting is clean before submitting PRs.

## 📝 License

This project is part of the Lovable platform.
