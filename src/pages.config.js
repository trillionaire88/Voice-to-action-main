/**
 * pages.config.js - Page routing configuration
 * All pages use React.lazy for code-splitting to minimize initial bundle size.
 */
import React from 'react';
import __Layout from './Layout.jsx';

const About = React.lazy(() => import('./pages/About'));
const AdminCommunities = React.lazy(() => import('./pages/AdminCommunities'));
const AdminAITools = React.lazy(() => import('./pages/AdminAITools'));
const AdminCharityReview = React.lazy(() => import('./pages/AdminCharityReview'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Appeals = React.lazy(() => import('./pages/Appeals'));
const AnalyticsAPI = React.lazy(() => import('./pages/AnalyticsAPI'));
const AuthorityDirectoryAdmin = React.lazy(() => import('./pages/AuthorityDirectoryAdmin'));
const CSRDashboard = React.lazy(() => import('./pages/CSRDashboard'));
const CharityProfile = React.lazy(() => import('./pages/CharityProfile'));
const CitizenJury = React.lazy(() => import('./pages/CitizenJury'));
const Communities = React.lazy(() => import('./pages/Communities'));
const CommunityCouncils = React.lazy(() => import('./pages/CommunityCouncils'));
const CommunityDetail = React.lazy(() => import('./pages/CommunityDetail'));
const CommunityImpactCampaigns = React.lazy(() => import('./pages/CommunityImpactCampaigns'));
const CommunitySubscription = React.lazy(() => import('./pages/CommunitySubscription'));
const ComplianceDashboard = React.lazy(() => import('./pages/ComplianceDashboard'));
const CongressDashboard = React.lazy(() => import('./pages/CongressDashboard'));
const Constitution = React.lazy(() => import('./pages/Constitution'));
const CreateCommunity = React.lazy(() => import('./pages/CreateCommunity'));
const CreateCreatorCommunity = React.lazy(() => import('./pages/CreateCreatorCommunity'));
const CreatePetition = React.lazy(() => import('./pages/CreatePetition'));
const CreatePoll = React.lazy(() => import('./pages/CreatePoll'));
const CreateScorecard = React.lazy(() => import('./pages/CreateScorecard'));
const CreatorReferral = React.lazy(() => import('./pages/CreatorReferral'));
const CreatorSubscription = React.lazy(() => import('./pages/CreatorSubscription'));
const CrisisHub = React.lazy(() => import('./pages/CrisisHub'));
const CurrentIssues = React.lazy(() => import('./pages/CurrentIssues'));
const DecisionTracking = React.lazy(() => import('./pages/DecisionTracking'));
const DeepAnalytics = React.lazy(() => import('./pages/DeepAnalytics'));
const Discovery = React.lazy(() => import('./pages/Discovery'));
const EmbedWidget = React.lazy(() => import('./pages/EmbedWidget'));
const ElectionIntegrity = React.lazy(() => import('./pages/ElectionIntegrity'));
const FigureProfile = React.lazy(() => import('./pages/FigureProfile'));
const FinanceDashboard = React.lazy(() => import('./pages/FinanceDashboard'));
const FreeExpressionPolicy = React.lazy(() => import('./pages/FreeExpressionPolicy'));
const FundingTransparency = React.lazy(() => import('./pages/FundingTransparency'));
const GetVerified = React.lazy(() => import('./pages/GetVerified'));
const GlobalEventRadar = React.lazy(() => import('./pages/GlobalEventRadar'));
const GlobalOpinion = React.lazy(() => import('./pages/GlobalOpinion'));
const Governance = React.lazy(() => import('./pages/Governance'));
const Home = React.lazy(() => import('./pages/Home'));
const HowItWorks = React.lazy(() => import('./pages/HowItWorks'));
const HumanRightsBarometer = React.lazy(() => import('./pages/HumanRightsBarometer'));
const IdentityVerification = React.lazy(() => import('./pages/IdentityVerification'));
const ImpactMap = React.lazy(() => import('./pages/ImpactMap'));
const InfluenceIndex = React.lazy(() => import('./pages/InfluenceIndex'));
const InstitutionHub = React.lazy(() => import('./pages/InstitutionHub'));
const InstitutionProfile = React.lazy(() => import('./pages/InstitutionProfile'));
const LegalSettings = React.lazy(() => import('./pages/LegalSettings'));
const MandateLedger = React.lazy(() => import('./pages/MandateLedger'));
const MasterAdmin = React.lazy(() => import('./pages/MasterAdmin'));
const MediaAmplification = React.lazy(() => import('./pages/MediaAmplification'));
const MediaCredibility = React.lazy(() => import('./pages/MediaCredibility'));
const ModeratorDashboard = React.lazy(() => import('./pages/ModeratorDashboard'));
const MyDonations = React.lazy(() => import('./pages/MyDonations'));
const MyPayments = React.lazy(() => import('./pages/MyPayments'));
const ParliamentaryWatch = React.lazy(() => import('./pages/ParliamentaryWatch'));
const PeoplesTribunal = React.lazy(() => import('./pages/PeoplesTribunal'));
const PetitionDetail = React.lazy(() => import('./pages/PetitionDetail'));
const PetitionWithdraw = React.lazy(() => import('./pages/PetitionWithdraw'));
const Petitions = React.lazy(() => import('./pages/Petitions'));
const PlatformFunding = React.lazy(() => import('./pages/PlatformFunding'));
const PlatformStats = React.lazy(() => import('./pages/PlatformStats'));
const PolicyDiscussions = React.lazy(() => import('./pages/PolicyDiscussions'));
const PollDetail = React.lazy(() => import('./pages/PollDetail'));
const PrivateGroups = React.lazy(() => import('./pages/PrivateGroups'));
const Profile = React.lazy(() => import('./pages/Profile'));
const PublicFigureApplication = React.lazy(() => import('./pages/PublicFigureApplication'));
const PublicFigures = React.lazy(() => import('./pages/PublicFigures'));
const PublicVoting = React.lazy(() => import('./pages/PublicVoting'));
const Purpose = React.lazy(() => import('./pages/Purpose'));
const RealityIndex = React.lazy(() => import('./pages/RealityIndex'));
const ReferralEarnings = React.lazy(() => import('./pages/ReferralEarnings'));
const RiskMonitor = React.lazy(() => import('./pages/RiskMonitor'));
const ScorecardDetail = React.lazy(() => import('./pages/ScorecardDetail'));
const Scorecards = React.lazy(() => import('./pages/Scorecards'));
const Search = React.lazy(() => import('./pages/Search'));
const SecuritySettings = React.lazy(() => import('./pages/SecuritySettings'));
const Newsfeed = React.lazy(() => import('./pages/Newsfeed'));
const OrganisationDashboard = React.lazy(() => import('./pages/OrganisationDashboard'));
const PetitionDelivery = React.lazy(() => import('./pages/PetitionDelivery'));
const PressKit = React.lazy(() => import('./pages/PressKit'));
const PromoteContent = React.lazy(() => import('./pages/PromoteContent'));
const PublicAuditLog = React.lazy(() => import('./pages/PublicAuditLog'));
const VerifySignature = React.lazy(() => import('./pages/VerifySignature'));
const FeedSettings = React.lazy(() => import('./pages/FeedSettings'));
const SavedItems = React.lazy(() => import('./pages/SavedItems'));
const MessageSettings = React.lazy(() => import('./pages/MessageSettings'));
const SubmitCharity = React.lazy(() => import('./pages/SubmitCharity'));
const SubmitImpactEvent = React.lazy(() => import('./pages/SubmitImpactEvent'));
const SupportOwner = React.lazy(() => import('./pages/SupportOwner'));
const TakedownRequest = React.lazy(() => import('./pages/TakedownRequest'));
// TermsOfService and CookiePolicy are statically imported and handled in App.jsx
const ThematicWorlds = React.lazy(() => import('./pages/ThematicWorlds'));
const TransparencyReport = React.lazy(() => import('./pages/TransparencyReport'));
const TrendingPetitions = React.lazy(() => import('./pages/TrendingPetitions'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const WorldView = React.lazy(() => import('./pages/WorldView'));

export const PAGES = {
    "About": About,
    "AdminAITools": AdminAITools,
    "AdminCharityReview": AdminCharityReview,
    "AdminCommunities": AdminCommunities,
    "AdminDashboard": AdminDashboard,
    "Appeals": Appeals,
    "AnalyticsAPI": AnalyticsAPI,
    "AuthorityDirectoryAdmin": AuthorityDirectoryAdmin,
    "CSRDashboard": CSRDashboard,
    "CharityProfile": CharityProfile,
    "CitizenJury": CitizenJury,
    "Communities": Communities,
    "CommunityCouncils": CommunityCouncils,
    "CommunityDetail": CommunityDetail,
    "CommunityImpactCampaigns": CommunityImpactCampaigns,
    "CommunitySubscription": CommunitySubscription,
    "ComplianceDashboard": ComplianceDashboard,
    "CongressDashboard": CongressDashboard,
    "Constitution": Constitution,
    "CreateCommunity": CreateCommunity,
    "CreateCreatorCommunity": CreateCreatorCommunity,
    "CreatePetition": CreatePetition,
    "CreatePoll": CreatePoll,
    "CreateScorecard": CreateScorecard,
    "CreatorReferral": CreatorReferral,
    "CreatorSubscription": CreatorSubscription,
    "CrisisHub": CrisisHub,
    "CurrentIssues": CurrentIssues,
    "DecisionTracking": DecisionTracking,
    "DeepAnalytics": DeepAnalytics,
    "Discovery": Discovery,
    "EmbedWidget": EmbedWidget,
    "ElectionIntegrity": ElectionIntegrity,
    "FigureProfile": FigureProfile,
    "FinanceDashboard": FinanceDashboard,
    "FreeExpressionPolicy": FreeExpressionPolicy,
    "FundingTransparency": FundingTransparency,
    "GetVerified": GetVerified,
    "GlobalEventRadar": GlobalEventRadar,
    "GlobalOpinion": GlobalOpinion,
    "Governance": Governance,
    "Home": Home,
    "HowItWorks": HowItWorks,
    "HumanRightsBarometer": HumanRightsBarometer,
    "IdentityVerification": IdentityVerification,
    "ImpactMap": ImpactMap,
    "InfluenceIndex": InfluenceIndex,
    "InstitutionHub": InstitutionHub,
    "InstitutionProfile": InstitutionProfile,
    "LegalSettings": LegalSettings,
    "MandateLedger": MandateLedger,
    "MasterAdmin": MasterAdmin,
    "MediaAmplification": MediaAmplification,
    "MediaCredibility": MediaCredibility,
    "ModeratorDashboard": ModeratorDashboard,
    "MyDonations": MyDonations,
    "MyPayments": MyPayments,
    "ParliamentaryWatch": ParliamentaryWatch,
    "PeoplesTribunal": PeoplesTribunal,
    "PetitionDetail": PetitionDetail,
    "PetitionWithdraw": PetitionWithdraw,
    "Petitions": Petitions,
    "PlatformFunding": PlatformFunding,
    "PlatformStats": PlatformStats,
    "PolicyDiscussions": PolicyDiscussions,
    "PollDetail": PollDetail,
    "PrivateGroups": PrivateGroups,
    "Profile": Profile,
    "PublicFigureApplication": PublicFigureApplication,
    "PublicFigures": PublicFigures,
    "PublicVoting": PublicVoting,
    "Purpose": Purpose,
    "RealityIndex": RealityIndex,
    "ReferralEarnings": ReferralEarnings,
    "RiskMonitor": RiskMonitor,
    "ScorecardDetail": ScorecardDetail,
    "Scorecards": Scorecards,
    "Search": Search,
    "SecuritySettings": SecuritySettings,
    "Newsfeed": Newsfeed,
    "OrganisationDashboard": OrganisationDashboard,
    "PetitionDelivery": PetitionDelivery,
    "PressKit": PressKit,
    "PromoteContent": PromoteContent,
    "PublicAuditLog": PublicAuditLog,
    "FeedSettings": FeedSettings,
    "SavedItems": SavedItems,
    "MessageSettings": MessageSettings,
    "SubmitCharity": SubmitCharity,
    "SubmitImpactEvent": SubmitImpactEvent,
    "SupportOwner": SupportOwner,
    "TakedownRequest": TakedownRequest,
    // TermsOfService and CookiePolicy handled as explicit static routes in App.jsx
    "ThematicWorlds": ThematicWorlds,
    "TransparencyReport": TransparencyReport,
    "TrendingPetitions": TrendingPetitions,
    "VerifyEmail": VerifyEmail,
    "VerifySignature": VerifySignature,
    "WorldView": WorldView,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};