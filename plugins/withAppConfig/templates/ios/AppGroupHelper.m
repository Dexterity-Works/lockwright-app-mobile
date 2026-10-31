#import "AppGroupHelper.h"

@implementation AppGroupHelper

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// The IDs this binary was built with. JS reads them instead of the Expo
// config, which follows whatever APP_VARIANT Metro was started with.
- (NSDictionary *)constantsToExport
{
  return @{
    @"appGroupIdentifier": @"$(APP_GROUP_IDENTIFIER)",
    @"bundleIdentifier": [[NSBundle mainBundle] bundleIdentifier] ?: [NSNull null]
  };
}

RCT_EXPORT_METHOD(getSharedDirectoryPath:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *appGroupId = @"$(APP_GROUP_IDENTIFIER)";
  NSURL *containerURL = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:appGroupId];
  
  if (containerURL) {
    NSString *absolutePath = [containerURL path];
    NSLog(@"App Group container path: %@", absolutePath);
    resolve(absolutePath);
  } else {
    NSLog(@"Failed to get App Group container for ID: %@", appGroupId);
    reject(@"APP_GROUP_ERROR", @"Unable to access App Group container", nil);
  }
}

@end