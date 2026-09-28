# i mobile

Virtual-number app and website for provider-issued Nigerian +234 numbers.

## Architecture
- Android/Kotlin client
- Static website
- Supabase Auth + Postgres + RLS
- Supabase Edge Functions
- Voicebip integration for telephony

## Security
Provider API credentials stay in Supabase Edge Function secrets, never in the APK or website. Supabase documents production Edge Function secrets for this pattern.

Required Supabase secrets before live number provisioning:
- VOICEBIP_API_KEY
- VOICEBIP_AGENT_ID

Use provider sandbox credentials first. A real number is issued by the telecom/virtual-number provider; i mobile does not manufacture phone numbers.
