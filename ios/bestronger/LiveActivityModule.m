#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveActivityModule, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)params)
RCT_EXTERN_METHOD(updateActivity:(NSDictionary *)params)
RCT_EXTERN_METHOD(endActivity)

@end
