// Mock implementations for lucide-react icons
// These are simple functional components returning a div with a data-testid for easy identification in tests.

export const ArrowLeft = (props: any) => <div data-testid="mock-icon-arrowleft" {...props}>ArrowLeft</div>;
export const Send = (props: any) => <div data-testid="mock-icon-send" {...props}>Send</div>;
export const Volume2 = (props: any) => <div data-testid="mock-icon-volume2" {...props}>Volume2</div>;
export const VolumeX = (props: any) => <div data-testid="mock-icon-volumex" {...props}>VolumeX</div>;
export const Loader2 = (props: any) => <div data-testid="mock-icon-loader2" {...props}>Loader2</div>;
export const HelpCircle = (props: any) => <div data-testid="mock-icon-helpcircle" {...props}>HelpCircle</div>;

// If lucide-react exports other things that are used and need mocking (e.g., an 'icons' object),
// they can be added here as well.
// export const icons = {}; // Example if 'icons' is an exported object from lucide-react
