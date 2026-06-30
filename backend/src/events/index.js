import eventBus from './eventBus.js';
import registerOnOrderPlaced from './handlers/onOrderPlaced.js';
import registerOnPaymentVerified from './handlers/onPaymentVerified.js';
import registerOnOrderConfirmed from './handlers/onOrderConfirmed.js';
import registerOnPaymentFailed from './handlers/onPaymentFailed.js';
import registerOnExecutiveApproved from './handlers/onExecutiveApproved.js';
import registerOnCustomerApproved from './handlers/onCustomerApproved.js';
import registerOnPasswordResetRequested from './handlers/onPasswordResetRequested.js';
import registerOnNotificationTrigger from './handlers/onNotificationTrigger.js';

// Register all decoupled handlers to the eventBus
registerOnOrderPlaced(eventBus);
registerOnPaymentVerified(eventBus);
registerOnOrderConfirmed(eventBus);
registerOnPaymentFailed(eventBus);
registerOnExecutiveApproved(eventBus);
registerOnCustomerApproved(eventBus);
registerOnPasswordResetRequested(eventBus);
registerOnNotificationTrigger(eventBus);

export default eventBus;
