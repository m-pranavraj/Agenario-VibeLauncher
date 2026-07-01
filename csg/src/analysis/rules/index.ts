import { RuleEngine, RuleRegistry } from './engine/rule-engine.js';

/* Pillar 1: Security */
import { SQLInjectionDirectRule, SQLInjectionMultiHopRule, SQLInjectionSecondOrderRule, SQLInjectionORMBypassRule, SQLInjectionConcatRule, SQLInjectionDynamicWhereRule, SQLInjectionOrderByRule, SQLInjectionInClauseRule, SQLInjectionLikeClauseRule, SQLInjectionBatchQueryRule } from './security/injection-rules.js';
import { NoSQLOperatorInjectionRule, NoSQLAuthBypassRule, NoSQLWhereInjectionRule, NoSQLRegexInjectionRule, NoSQLMassAssignmentRule, NoSQLExprInjectionRule, NoSQLFunctionInjectionRule, NoSQLAggregationPipelineRule, NoSQLLookupInjectionRule, NoSQLSchemaBypassRule } from './security/nosql-injection-rules.js';
import { CommandInjectionExecRule, CommandInjectionShellExpansionRule, CommandInjectionSpawnShellRule, CommandInjectionHeaderRule, CommandInjectionURLRule, CommandInjectionSpawnArgBypassRule, CommandInjectionScriptGenRule, CommandInjectionEvalShellRule, CommandInjectionPathTraversalRule, CommandInjectionNpmScriptRule } from './security/command-injection-rules.js';
import { SSTIDirectRule, SSTIVariableInjectionRule, SSTIExtendsInjectionRule, SSTIAutoEscapeBypassRule, SSTIErrorPageRule, SSTIRawOutputRule, SSTICachePoisoningRule, SSTIDebugModeRule, SSTIInlinePartialRule, SSTIWhitespaceControlRule } from './security/ssti-rules.js';
import { JWTNoneAlgorithmRule, JWTKeyConfusionRule, JWTWeakSecretRule, InsecureRandomRule, TimingAttackRule, WeakPasswordHashRule, ECBEncryptionRule, HardcodedIVRule, NoIntegrityCheckRule, PredictableSessionTokenRule, JWTJKUInjectionRule, JWTJWKInjectionRule, JWTKidPathTraversalRule, JWTSubClaimBypassRule, JWTEmptySecretRule, JWTAudienceIssuerRule, JWTNoExpirationRule, SessionFixationRule, CSRFQueryLeakRule, OAuthStateCSRFRule, OAuthRedirectURIRule, TimingArrayEveryRule, HashLengthExtensionRule, GCMNonceReuseRule, RSAPKCS1PaddingRule, WeakTLSConfigRule, HardcodedTLSKeyRule, LoginEnumerationRule, NoRateLimitAuthRule, PredictableResetTokenRule, HardcodedSecretRule } from './security/crypto-auth-rules.js';
import { PrototypePollutionMergeRule, PrototypePollutionSetterRule, MassAssignmentORMRule, InsecureDeserializationYamlRule, InsecureDeserializationJSONRule, EvalFunctionConstructorRule, TypeJugglingRule, DeepCloneProtoPollutionRule, ObjectAssignPollutionRule, DeserializationEvalRule, PickleDeserializationRule, LodashDefaultsPollutionRule, TypeJugglingArrayRule, GraphQLMassAssignmentRule, SymbolKeyedPollutionRule, ErrorPrepareStackTraceRule, URLPrototypePollutionRule, ProxyPrototypeBypassRule, RegExpPrototypePollutionRule, ArrayFlattenPollutionRule, BinaryDeserializationRule, LDAPDeserializationRule, LoosePasswordCompareRule, ObjectIsTypeCoercionRule, MongoSetMassAssignmentRule, VMRunInThisContextRule, ReducePrototypePollutionRule, PrismaMassAssignmentRule, ExoticJSONParserPollutionRule, DefineGetterSetterPollutionRule } from './security/memory-object-rules.js';
import { SSRFetchRule, SSRFDNSRebindingRule, SSRFRedirectRule, TOCTOURaceConditionRule, CORSCredentialLeakRule, OpenRedirectRule, SSRFBlindOOBRule, SSRFPDFGeneratorRule, RequestSmugglingRule, HostHeaderInjectionRule, HTTPMethodTamperingRule, CachePoisoningUnkeyedRule, WebSocketOriginRule, GraphQLIntrospectionRule, GRPCReflectionRule } from './security/networking-logic-rules.js';

/* Pillar 2: Performance */
import { NPlusOneQueryRule, MissingIndexRule, CartesianProductJoinRule, LargeInClauseRule, MissingCompositeIndexRule, ImplicitTypeCastRule, GraphQLDataloaderMissRule, MissingPaginationRule, DeepNestedLoopRule, SelectStarRule, MissingBatchInsertRule, RawSQLConcatenationRule, MissingPoolTimeoutRule, LikeLeadingWildcardRule, MissingOffsetPaginationRule, UnindexedFilterColumnRule, ORConditionNoIndexMergeRule, OrderByExpressionRule, LargeInListRule, ImplicitCrossJoinRule, SubqueryToJoinRule, MissingQueryTimeoutRule, CountStarWithoutApproxRule, FunctionOnColumnRule, DeepNestedWhereRule } from './performance/algorithmic-rules.js';
import { ReactClosureLeakRule, UnboundedCacheRule, ConnectionPoolExhaustionRule, TimerLeakRule, DetachedDOMLeakRule, ObserverUnsubscribeRule, EventEmitterLeakRule, ClosureLargeCaptureRule, RAFWithoutCancelRule, SubscriptionLeakRule, ClassTimerLeakRule, ConsoleLogRetentionRule, WebSocketReconnectLeakRule, LargeInlineDataRule, CircularReferenceLeakRule, StringConcatLeakRule, ObjectURLNotRevokedRule, AbortControllerLeakRule, ResizeObserverLoopRule, MissingReactKeyRule, InlineFunctionJSXRule, LargeContextReRenderRule, StorageWriteInRenderRule } from './performance/memory-leak-rules.js';
import { SyncBlockingRule, PromiseWaterfallRule, BundleBloatRule, LargeJSONMainThreadRule, CPUHeavyLoopRule, UnawaitedPromiseRule, RecursiveTimeoutDriftRule, LayoutThrashingRule, ImageMissingDimensionsRule, MissingCodeSplitRule, InlineScriptRenderBlockRule, RAFWithoutCancelRule2, IntervalNoClearRule, ExcessiveDOMNodesRule, SyncXHRRule, InnerHTMLInLoopRule, ForcedReflowRule, MissingDocumentFragmentRule, TooManyEventListenersRule, MissingDebounceScrollRule, MissingIdleCallbackRule, HistoryInLoopRule, ScrollIntoViewJankRule, MissingWillChangeRule, MissingIntersectionObserverRule } from './performance/event-loop-rules.js';

/* Pillar 3: UX */
import { ClickableDivNoKeyboardRule, MissingAltTextRule, IconButtonNoLabelRule, MissingFocusTrapRule, MissingInputLabelRule, MissingAriaLandmarksRule, LowColorContrastRule, LogicalFocusOrderRule, MissingSkipLinkRule, MissingFormErrorAnnouncementRule, SmallTouchTargetRule, MissingHeadingHierarchyRule, MissingHtmlLangRule, MissingAriaExpandedRule, MissingAriaCurrentRule, AutoplayNoControlsRule, IframeMissingTitleRule, MissingTableHeaderScopeRule, MissingVideoCaptionsRule, MissingAudioTranscriptRule, MissingAbbreviationExpansionRule, MissingTableCaptionRule, MissingFigureCaptionRule, MissingFieldsetLegendRule, MissingCharCounterRule, MissingAccessibleEmojiRule, MissingFocusVisibleRule, MissingListSemanticsRule, MissingDescriptionListRule, MissingTextSpacingSupportRule, MissingZoomSupportRule, MissingTouchTargetSpacingRule } from './ux/accessibility-rules.js';
import { SilentCatchRule, NavigationDeadEndRule, CumulativeLayoutShiftRule, FirstInputDelayRule, MissingLoadingStateRule, MissingEmptyStateRule, MissingConfirmationDialogRule, MissingUndoRule, MissingFormValidationRule, InfiniteScrollNoIndicatorRule, ToastNoAutoDismissRule, ModalNoCloseButtonRule, SearchWithoutDebounceRule, MissingDocumentTitleRule, MultiStepNoProgressRule, UnsavedChangesPromptRule, MissingSkeletonLoaderRule, MissingLazyLoadingRule, MissingStateTransitionRule, FontLoadingFOUTRule, MissingProgressiveLoadingRule, MissingOptimisticUpdateRule, MissingPullToRefreshRule, MissingSwipeGestureRule, MissingOfflineIndicatorRule, MissingRetryOnErrorRule, MissingBackNavigationHandlerRule, MissingDeepLinkRule, MissingClipboardFeedbackRule, MissingDragDropFeedbackRule, MissingSearchHistoryRule, MissingAutocompleteRule, MissingIdleSessionTimeoutRule, MissingTabSyncRule, MissingBeforeInstallPromptRule, MissingKeyboardNavigationGridRule, MissingAccessibilityAnnouncementRule, MissingImageZoomRule, MissingPushNotificationPermissionRule, MissingCameraMicFallbackRule, MissingFileUploadProgressRule, MissingDataExportProgressRule, MissingCharLimitIndicatorRule, MissingPasswordStrengthIndicatorRule, MissingInputMaskRule, MissingAutoSaveIndicatorRule, MissingLongPressContextMenuRule, MissingKeyboardDismissOnScrollRule, MissingPullToRefreshDataRule, MissingEmptySearchStateRule, MissingNetworkErrorStateRule, MissingFirstRunExperienceRule, MissingHapticFeedbackRule, MissingSafeAreaRule, MissingDarkModeSupportRule } from './ux/interaction-rules.js';

/* Pillar 4: Compliance */
import { PIILeakageToLogRule, PIIInResponseRule, CookieConsentValidationRule, RightToErasureRule, MissingDataRetentionRule, PIIInCustomHeadersRule, MissingCookieBannerRule, PIIInQueryParamsRule, MissingPrivacyPolicyRule, MissingDSAREndpointRule, PIIInErrorResponseRule, PIIInSSRRule, MissingSameSiteCookieRule, PIIInFileExportRule, MissingDataProcessingRecordRule, MissingDataClassificationRule, MissingConsentPreferenceStorageRule, MissingPersonalDataExportFormatRule, MissingPIIEncryptionAtRestRule, MissingPseudoAnonymizationRule, MissingCookiePreferencesRule, MissingDataMappingRule, MissingConsentRecordKeepingRule, MissingThirdPartyDataSharingDisclosureRule, MissingAgeGateRule, MissingSensitiveDataMaskingRule, MissingPrivacyNoticeLinkRule, MissingUserDataAccessDashboardRule, MissingBiometricConsentRule, MissingLocationConsentRule } from './compliance/privacy-rules.js';
import { MissingAuditTrailRule, MissingDataEncryptionRule, MissingHealthCheckRule, CreditCardInLogsRule, CrossBorderDataTransferRule, MissingPHIAccessLogRule, CardDataInTransitRule, MissingCSPHeaderRule, MissingSecurityHeadersRule, SensitiveEndpointRateLimitRule, MissingAPIVersioningRule, MissingDataBackupRule, MissingCorsRestrictionRule, MissingAccountLockoutRule, MissingDataPortabilityRule, MissingPasswordPolicyRule, MissingBreachNotificationRule, MissingConsentWithdrawalRule, MissingDataMinimizationRule, MissingDataPurgeRule, MissingProcessorRegisterRule, MissingVulnerabilityScanRule, MissingDependencyAuditRule, MissingSecretScanningRule, MissingAccessReviewRule, MissingSessionTimeoutRule, MissingMFARule, MissingLoginAttemptTrackingRule, MissingHIPAAAuthorizationRule, MissingPCIComplianceCheckRule, MissingSOC2MonitoringRule, MissingDisasterRecoveryRule, MissingChangeManagementRule, MissingVendorAssessmentRule, MissingEmployeeTrainingLogRule, MissingThirdPartyAccessLogRule, MissingDataRetentionPolicyHeaderRule, MissingIncidentResponsePlanRule } from './compliance/framework-rules.js';

export function createRuleRegistry(): RuleRegistry {
  const registry = new RuleRegistry();

  /* ─── Pillar 1: Security (150 techniques) ─── */

  // Injection: SQLi (techniques 1-10)
  registry.register(new SQLInjectionDirectRule());
  registry.register(new SQLInjectionMultiHopRule());
  registry.register(new SQLInjectionSecondOrderRule());
  registry.register(new SQLInjectionORMBypassRule());
  registry.register(new SQLInjectionConcatRule());
  registry.register(new SQLInjectionDynamicWhereRule());
  registry.register(new SQLInjectionOrderByRule());
  registry.register(new SQLInjectionInClauseRule());
  registry.register(new SQLInjectionLikeClauseRule());
  registry.register(new SQLInjectionBatchQueryRule());

  // Injection: NoSQL (techniques 11-20)
  registry.register(new NoSQLOperatorInjectionRule());
  registry.register(new NoSQLAuthBypassRule());
  registry.register(new NoSQLWhereInjectionRule());
  registry.register(new NoSQLRegexInjectionRule());
  registry.register(new NoSQLMassAssignmentRule());
  registry.register(new NoSQLExprInjectionRule());
  registry.register(new NoSQLFunctionInjectionRule());
  registry.register(new NoSQLAggregationPipelineRule());
  registry.register(new NoSQLLookupInjectionRule());
  registry.register(new NoSQLSchemaBypassRule());

  // Injection: Command (techniques 21-30)
  registry.register(new CommandInjectionExecRule());
  registry.register(new CommandInjectionShellExpansionRule());
  registry.register(new CommandInjectionSpawnShellRule());
  registry.register(new CommandInjectionHeaderRule());
  registry.register(new CommandInjectionURLRule());
  registry.register(new CommandInjectionSpawnArgBypassRule());
  registry.register(new CommandInjectionScriptGenRule());
  registry.register(new CommandInjectionEvalShellRule());
  registry.register(new CommandInjectionPathTraversalRule());
  registry.register(new CommandInjectionNpmScriptRule());

  // Injection: SSTI (techniques 31-40)
  registry.register(new SSTIDirectRule());
  registry.register(new SSTIVariableInjectionRule());
  registry.register(new SSTIExtendsInjectionRule());
  registry.register(new SSTIAutoEscapeBypassRule());
  registry.register(new SSTIErrorPageRule());
  registry.register(new SSTIRawOutputRule());
  registry.register(new SSTICachePoisoningRule());
  registry.register(new SSTIDebugModeRule());
  registry.register(new SSTIInlinePartialRule());
  registry.register(new SSTIWhitespaceControlRule());

  // Crypto & Auth (techniques 41-70)
  registry.register(new JWTNoneAlgorithmRule());      // 41
  registry.register(new JWTKeyConfusionRule());         // 42
  registry.register(new JWTWeakSecretRule());           // 43
  registry.register(new InsecureRandomRule());          // 51
  registry.register(new TimingAttackRule());            // 61
  registry.register(new WeakPasswordHashRule());        // 52
  registry.register(new ECBEncryptionRule());           // 53
  registry.register(new HardcodedIVRule());             // 54
  registry.register(new NoIntegrityCheckRule());        // 55
  registry.register(new PredictableSessionTokenRule()); // 56
  registry.register(new JWTJKUInjectionRule());            // 44
  registry.register(new JWTJWKInjectionRule());            // 45
  registry.register(new JWTKidPathTraversalRule());        // 46
  registry.register(new JWTSubClaimBypassRule());          // 47
  registry.register(new JWTEmptySecretRule());             // 48
  registry.register(new JWTAudienceIssuerRule());          // 49
  registry.register(new JWTNoExpirationRule());            // 50
  registry.register(new SessionFixationRule());            // 57
  registry.register(new CSRFQueryLeakRule());              // 58
  registry.register(new OAuthStateCSRFRule());             // 59
  registry.register(new OAuthRedirectURIRule());           // 60
  registry.register(new TimingArrayEveryRule());           // 62
  registry.register(new HashLengthExtensionRule());        // 64
  registry.register(new GCMNonceReuseRule());              // 65
  registry.register(new RSAPKCS1PaddingRule());            // 66
  registry.register(new WeakTLSConfigRule());              // 67
  registry.register(new HardcodedTLSKeyRule());            // 68
  registry.register(new LoginEnumerationRule());           // 69
  registry.register(new NoRateLimitAuthRule());            // 70
  registry.register(new PredictableResetTokenRule());      // 63
  registry.register(new HardcodedSecretRule());             // 71

  // Memory & Object Attacks (techniques 71-110)
  registry.register(new PrototypePollutionMergeRule());      // 71
  registry.register(new PrototypePollutionSetterRule());     // 72
  registry.register(new MassAssignmentORMRule());            // 81
  registry.register(new InsecureDeserializationYamlRule());  // 91
  registry.register(new InsecureDeserializationJSONRule());  // 92
  registry.register(new EvalFunctionConstructorRule());      // 93
  registry.register(new TypeJugglingRule());                 // 101
  registry.register(new DeepCloneProtoPollutionRule());      // 73
  registry.register(new ObjectAssignPollutionRule());        // 74
  registry.register(new LodashDefaultsPollutionRule());      // 75
  registry.register(new GraphQLMassAssignmentRule());        // 82
  registry.register(new DeserializationEvalRule());          // 94
  registry.register(new PickleDeserializationRule());        // 95
  registry.register(new TypeJugglingArrayRule());            // 102
  registry.register(new SymbolKeyedPollutionRule());          // 76
  registry.register(new ErrorPrepareStackTraceRule());        // 77
  registry.register(new URLPrototypePollutionRule());         // 78
  registry.register(new ProxyPrototypeBypassRule());           // 79
  registry.register(new RegExpPrototypePollutionRule());       // 80
  registry.register(new ArrayFlattenPollutionRule());          // 83
  registry.register(new BinaryDeserializationRule());          // 96
  registry.register(new LDAPDeserializationRule());           // 97
  registry.register(new LoosePasswordCompareRule());          // 103
  registry.register(new ObjectIsTypeCoercionRule());          // 104
  registry.register(new MongoSetMassAssignmentRule());        // 84
  registry.register(new VMRunInThisContextRule());            // 100
  registry.register(new ReducePrototypePollutionRule());      // 85
  registry.register(new PrismaMassAssignmentRule());          // 86
  registry.register(new ExoticJSONParserPollutionRule());     // 98
  registry.register(new DefineGetterSetterPollutionRule());   // 87

  // Networking & Logic (techniques 111-150)
  registry.register(new SSRFetchRule());                    // 111
  registry.register(new SSRFDNSRebindingRule());             // 112
  registry.register(new SSRFRedirectRule());                 // 113
  registry.register(new TOCTOURaceConditionRule());          // 121
  registry.register(new CORSCredentialLeakRule());           // 131
  registry.register(new OpenRedirectRule());                 // 141
  registry.register(new SSRFBlindOOBRule());                 // 114
  registry.register(new SSRFPDFGeneratorRule());             // 115
  registry.register(new RequestSmugglingRule());             // 122
  registry.register(new HostHeaderInjectionRule());          // 123
  registry.register(new HTTPMethodTamperingRule());          // 124
  registry.register(new CachePoisoningUnkeyedRule());        // 125
  registry.register(new WebSocketOriginRule());              // 134
  registry.register(new GraphQLIntrospectionRule());         // 132
  registry.register(new GRPCReflectionRule());               // 133

  /* ─── Pillar 2: Performance (50+ techniques) ─── */

  // Algorithmic & Database
  registry.register(new NPlusOneQueryRule());                // 1
  registry.register(new GraphQLDataloaderMissRule());        // 2
  registry.register(new LargeInClauseRule());                // 3
  registry.register(new MissingPaginationRule());            // 4
  registry.register(new MissingOffsetPaginationRule());      // 5
  registry.register(new LargeInListRule());                  // 6
  registry.register(new MissingQueryTimeoutRule());          // 7
  registry.register(new CountStarWithoutApproxRule());       // 8
  registry.register(new SelectStarRule());                   // 9
  registry.register(new MissingBatchInsertRule());           // 10
  registry.register(new RawSQLConcatenationRule());          // 11
  registry.register(new MissingPoolTimeoutRule());           // 12
  registry.register(new MissingIndexRule());                 // 21
  registry.register(new MissingCompositeIndexRule());        // 22
  registry.register(new ImplicitTypeCastRule());             // 23
  registry.register(new LikeLeadingWildcardRule());          // 24
  registry.register(new UnindexedFilterColumnRule());        // 25
  registry.register(new ORConditionNoIndexMergeRule());      // 26
  registry.register(new OrderByExpressionRule());            // 27
  registry.register(new FunctionOnColumnRule());             // 28
  registry.register(new DeepNestedWhereRule());              // 29
  registry.register(new CartesianProductJoinRule());         // 41
  registry.register(new DeepNestedLoopRule());               // 42
  registry.register(new ImplicitCrossJoinRule());            // 43
  registry.register(new SubqueryToJoinRule());              // 44

  // Memory & State Leaks
  registry.register(new ReactClosureLeakRule());             // 51
  registry.register(new DetachedDOMLeakRule());              // 52
  registry.register(new ObserverUnsubscribeRule());          // 53
  registry.register(new EventEmitterLeakRule());             // 54
  registry.register(new ClosureLargeCaptureRule());          // 55
  registry.register(new RAFWithoutCancelRule());             // 56
  registry.register(new SubscriptionLeakRule());             // 57
  registry.register(new ConsoleLogRetentionRule());          // 58
  registry.register(new WebSocketReconnectLeakRule());       // 59
  registry.register(new LargeInlineDataRule());              // 60
  registry.register(new CircularReferenceLeakRule());        // 61
  registry.register(new StringConcatLeakRule());             // 62
  registry.register(new ObjectURLNotRevokedRule());          // 63
  registry.register(new AbortControllerLeakRule());          // 64
  registry.register(new ResizeObserverLoopRule());           // 65
  registry.register(new MissingReactKeyRule());              // 66
  registry.register(new InlineFunctionJSXRule());            // 67
  registry.register(new LargeContextReRenderRule());         // 68
  registry.register(new StorageWriteInRenderRule());         // 69
  registry.register(new TimerLeakRule());                    // 71
  registry.register(new ClassTimerLeakRule());               // 72
  registry.register(new UnboundedCacheRule());               // 81
  registry.register(new ConnectionPoolExhaustionRule());     // 91

  // Event Loop & Rendering
  registry.register(new SyncBlockingRule());                 // 101
  registry.register(new LargeJSONMainThreadRule());          // 102
  registry.register(new CPUHeavyLoopRule());                 // 103
  registry.register(new UnawaitedPromiseRule());             // 104
  registry.register(new RecursiveTimeoutDriftRule());        // 105
  registry.register(new PromiseWaterfallRule());             // 116
  registry.register(new LayoutThrashingRule());              // 131
  registry.register(new ImageMissingDimensionsRule());       // 132
  registry.register(new InlineScriptRenderBlockRule());      // 133
  registry.register(new RAFWithoutCancelRule2());            // 134
  registry.register(new IntervalNoClearRule());              // 135
  registry.register(new ExcessiveDOMNodesRule());            // 136
  registry.register(new SyncXHRRule());                      // 137
  registry.register(new InnerHTMLInLoopRule());              // 138
  registry.register(new ForcedReflowRule());                 // 139
  registry.register(new MissingDocumentFragmentRule());      // 140
  registry.register(new TooManyEventListenersRule());        // 141
  registry.register(new BundleBloatRule());                  // 111
  registry.register(new MissingCodeSplitRule());             // 112
  registry.register(new MissingDebounceScrollRule());        // 143
  registry.register(new MissingIdleCallbackRule());          // 144
  registry.register(new HistoryInLoopRule());                // 145
  registry.register(new ScrollIntoViewJankRule());           // 146
  registry.register(new MissingWillChangeRule());            // 147
  registry.register(new MissingIntersectionObserverRule());  // 148

  /* ─── Pillar 3: UX/UI (60+ techniques) ─── */

  // Accessibility
  registry.register(new ClickableDivNoKeyboardRule());       // 1
  registry.register(new MissingAriaLandmarksRule());          // 2
  registry.register(new MissingSkipLinkRule());              // 3
  registry.register(new MissingHeadingHierarchyRule());      // 4
  registry.register(new MissingHtmlLangRule());              // 5
  registry.register(new MissingAriaExpandedRule());          // 6
  registry.register(new MissingAriaCurrentRule());           // 7
  registry.register(new AutoplayNoControlsRule());           // 8
  registry.register(new IframeMissingTitleRule());           // 9
  registry.register(new MissingTableHeaderScopeRule());      // 10
  registry.register(new MissingVideoCaptionsRule());         // 11
  registry.register(new MissingAudioTranscriptRule());       // 12
  registry.register(new MissingAbbreviationExpansionRule()); // 13
  registry.register(new MissingTableCaptionRule());          // 14
  registry.register(new MissingFigureCaptionRule());         // 15
  registry.register(new MissingFieldsetLegendRule());        // 16
  registry.register(new MissingCharCounterRule());           // 17
  registry.register(new MissingAccessibleEmojiRule());       // 18
  registry.register(new MissingFocusVisibleRule());          // 19
  registry.register(new MissingListSemanticsRule());         // 20
  registry.register(new MissingDescriptionListRule());       // 23
  registry.register(new MissingTextSpacingSupportRule());    // 24
  registry.register(new MissingZoomSupportRule());           // 25
  registry.register(new MissingTouchTargetSpacingRule());    // 26
  registry.register(new MissingFocusTrapRule());             // 21
  registry.register(new LogicalFocusOrderRule());            // 22
  registry.register(new LowColorContrastRule());             // 31
  registry.register(new MissingAltTextRule());               // 41
  registry.register(new IconButtonNoLabelRule());            // 42
  registry.register(new MissingInputLabelRule());            // 43
  registry.register(new MissingFormErrorAnnouncementRule()); // 44
  registry.register(new SmallTouchTargetRule());             // 46

  // Interaction & Perceived Performance
  registry.register(new NavigationDeadEndRule());            // 51
  registry.register(new MissingLoadingStateRule());          // 52
  registry.register(new MissingEmptyStateRule());            // 53
  registry.register(new MissingConfirmationDialogRule());    // 54
  registry.register(new MissingUndoRule());                  // 55
  registry.register(new InfiniteScrollNoIndicatorRule());   // 56
  registry.register(new ModalNoCloseButtonRule());           // 57
  registry.register(new SearchWithoutDebounceRule());        // 58
  registry.register(new MissingDocumentTitleRule());         // 59
  registry.register(new MultiStepNoProgressRule());          // 60
  registry.register(new UnsavedChangesPromptRule());         // 61
  registry.register(new SilentCatchRule());                  // 76
  registry.register(new ToastNoAutoDismissRule());           // 77
  registry.register(new CumulativeLayoutShiftRule());        // 101
  registry.register(new MissingSkeletonLoaderRule());        // 102
  registry.register(new MissingLazyLoadingRule());           // 103
  registry.register(new MissingStateTransitionRule());       // 104
  registry.register(new FontLoadingFOUTRule());              // 105
  registry.register(new MissingProgressiveLoadingRule());    // 106
  registry.register(new MissingFormValidationRule());        // 45
  registry.register(new FirstInputDelayRule());              // 126
  registry.register(new MissingOptimisticUpdateRule());      // 62
  registry.register(new MissingPullToRefreshRule());         // 63
  registry.register(new MissingSwipeGestureRule());          // 64
  registry.register(new MissingOfflineIndicatorRule());      // 65
  registry.register(new MissingRetryOnErrorRule());          // 66
  registry.register(new MissingBackNavigationHandlerRule()); // 67
  registry.register(new MissingDeepLinkRule());              // 68
  registry.register(new MissingClipboardFeedbackRule());     // 69
  registry.register(new MissingDragDropFeedbackRule());      // 70
  registry.register(new MissingSearchHistoryRule());         // 71
  registry.register(new MissingAutocompleteRule());          // 72
  registry.register(new MissingIdleSessionTimeoutRule());    // 73
  registry.register(new MissingTabSyncRule());               // 74
  registry.register(new MissingBeforeInstallPromptRule());   // 75
  registry.register(new MissingKeyboardNavigationGridRule()); // 78
  registry.register(new MissingAccessibilityAnnouncementRule()); // 79
  registry.register(new MissingImageZoomRule());             // 80
  registry.register(new MissingPushNotificationPermissionRule()); // 81
  registry.register(new MissingCameraMicFallbackRule());      // 82
  registry.register(new MissingFileUploadProgressRule());     // 83
  registry.register(new MissingDataExportProgressRule());     // 84
  registry.register(new MissingCharLimitIndicatorRule());     // 85
  registry.register(new MissingPasswordStrengthIndicatorRule()); // 86
  registry.register(new MissingInputMaskRule());              // 87
  registry.register(new MissingAutoSaveIndicatorRule());      // 88
  registry.register(new MissingLongPressContextMenuRule());   // 89
  registry.register(new MissingKeyboardDismissOnScrollRule()); // 90
  registry.register(new MissingPullToRefreshDataRule());      // 91
  registry.register(new MissingEmptySearchStateRule());       // 92
  registry.register(new MissingNetworkErrorStateRule());      // 93
  registry.register(new MissingFirstRunExperienceRule());     // 94
  registry.register(new MissingHapticFeedbackRule());         // 95
  registry.register(new MissingSafeAreaRule());               // 96
  registry.register(new MissingDarkModeSupportRule());        // 97

  /* ─── Pillar 4: Compliance (60+ techniques) ─── */

  // Privacy (GDPR, CCPA)
  registry.register(new PIILeakageToLogRule());              // 1
  registry.register(new PIIInResponseRule());                // 2
  registry.register(new PIIInCustomHeadersRule());           // 3
  registry.register(new PIIInQueryParamsRule());             // 4
  registry.register(new MissingPrivacyPolicyRule());         // 5
  registry.register(new PIIInErrorResponseRule());           // 6
  registry.register(new PIIInSSRRule());                     // 7
  registry.register(new PIIInFileExportRule());              // 8
  registry.register(new MissingDataProcessingRecordRule());  // 9
  registry.register(new MissingDataMinimizationRule());      // 10
  registry.register(new RightToErasureRule());               // 21
  registry.register(new MissingDSAREndpointRule());          // 22
  registry.register(new MissingDataPortabilityRule());       // 23
  registry.register(new MissingBreachNotificationRule());    // 24
  registry.register(new CookieConsentValidationRule());      // 36
  registry.register(new MissingCookieBannerRule());          // 37
  registry.register(new MissingSameSiteCookieRule());        // 38
  registry.register(new MissingConsentWithdrawalRule());     // 39
  registry.register(new MissingDataClassificationRule());    // 11
  registry.register(new MissingConsentPreferenceStorageRule()); // 12
  registry.register(new MissingPersonalDataExportFormatRule()); // 13
  registry.register(new MissingPIIEncryptionAtRestRule());   // 14
  registry.register(new MissingPseudoAnonymizationRule());   // 15
  registry.register(new MissingCookiePreferencesRule());     // 16
  registry.register(new MissingDataMappingRule());           // 17
  registry.register(new MissingConsentRecordKeepingRule());  // 18
  registry.register(new MissingThirdPartyDataSharingDisclosureRule()); // 19
  registry.register(new MissingAgeGateRule());               // 20
  registry.register(new MissingSensitiveDataMaskingRule());  // 22
  registry.register(new MissingPrivacyNoticeLinkRule());     // 23
  registry.register(new MissingUserDataAccessDashboardRule()); // 24
  registry.register(new MissingBiometricConsentRule());      // 25
  registry.register(new MissingLocationConsentRule());       // 26

  // Frameworks (SOC2, PCI-DSS, HIPAA)
  registry.register(new MissingAuditTrailRule());            // 51
  registry.register(new MissingPHIAccessLogRule());          // 52
  registry.register(new MissingCSPHeaderRule());             // 53
  registry.register(new MissingSecurityHeadersRule());       // 54
  registry.register(new SensitiveEndpointRateLimitRule());   // 55
  registry.register(new MissingAPIVersioningRule());         // 56
  registry.register(new MissingCorsRestrictionRule());       // 57
  registry.register(new MissingDataEncryptionRule());        // 71
  registry.register(new CreditCardInLogsRule());             // 72
  registry.register(new CardDataInTransitRule());            // 73
  registry.register(new MissingAccountLockoutRule());        // 74
  registry.register(new MissingPasswordPolicyRule());        // 75
  registry.register(new MissingHealthCheckRule());           // 91
  registry.register(new MissingDataBackupRule());            // 92

  // Retention & Operations
  registry.register(new MissingDataRetentionRule());         // 111
  registry.register(new MissingDataPurgeRule());             // 112
  registry.register(new CrossBorderDataTransferRule());      // 131
  registry.register(new MissingProcessorRegisterRule());     // 132
  registry.register(new MissingVulnerabilityScanRule());     // 58
  registry.register(new MissingDependencyAuditRule());       // 59
  registry.register(new MissingSecretScanningRule());         // 60
  registry.register(new MissingAccessReviewRule());           // 61
  registry.register(new MissingSessionTimeoutRule());         // 62
  registry.register(new MissingMFARule());                    // 63
  registry.register(new MissingLoginAttemptTrackingRule());   // 64
  registry.register(new MissingHIPAAAuthorizationRule());     // 65
  registry.register(new MissingPCIComplianceCheckRule());     // 66
  registry.register(new MissingSOC2MonitoringRule());         // 67
  registry.register(new MissingDisasterRecoveryRule());       // 93
  registry.register(new MissingChangeManagementRule());       // 94
  registry.register(new MissingVendorAssessmentRule());       // 95
  registry.register(new MissingEmployeeTrainingLogRule());    // 96
  registry.register(new MissingThirdPartyAccessLogRule());    // 97
  registry.register(new MissingDataRetentionPolicyHeaderRule()); // 98
  registry.register(new MissingIncidentResponsePlanRule());   // 99

  return registry;
}

export function createRuleEngine(registry?: RuleRegistry): RuleEngine {
  return new RuleEngine(registry || createRuleRegistry());
}

export { RuleEngine, RuleRegistry };
export type { Rule, RuleContext, RuleMeta, RuleFinding, RuleEngineReport, RuleCategory, RuleSeverity, TaintSlice } from './engine/types.js';
