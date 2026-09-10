/**
 * Organization API Interfaces
 *
 * Purpose: Request shape for creating a new organization.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** Payload sent to the create-organization API endpoint. */
export interface CreateOrganization {
    name: string;
    description: string;
    // Short unique organization code/slug.
    code: string;
    type: string;
    // User ID to assign as the organization's admin.
    org_admin: string;
}
