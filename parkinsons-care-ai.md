# Parkinson's Care AI

## Required Datasets and Web Resources

Use the following three sources as the baseline resource set for the website:

1. **CMS Provider Data (Doctors and Clinicians)**
   - URL: https://data.cms.gov/provider-data/dataset/6jpm-sxkc#data-table
   - Use for: medical provider discovery and referral options (Medical Agent).

2. **Parkinson's Foundation — Home Safety**
   - URL: https://www.parkinson.org/living-with-parkinsons/management/activities-daily-living/home-safety
   - Use for: home-safety recommendations and risk-reduction guidance (Equipment Agent).

3. **Parkinson's Foundation — Assistive Tech Devices**
   - URL: https://www.parkinson.org/living-with-parkinsons/management/activities-daily-living/assistive-tech-devices
   - Use for: assistive technology suggestions and daily-living support options (Equipment Agent and Caregiver Agent).

## Implementation Notes

- Treat these links as authoritative seed resources in the first website version.
- Normalize extracted fields into a shared schema (title, category, summary, url, last_verified_at, source_name).
- Mark all generated recommendations as informational and require user verification before decisions.
- Preserve source URLs in the UI so users can review original guidance directly.
