mergeInto(LibraryManager.library, {
  StoryAR_DispatchEvent: function (eventNamePtr, jsonPayloadPtr) {
    var eventName = UTF8ToString(eventNamePtr);
    var jsonPayload = UTF8ToString(jsonPayloadPtr);
    if (typeof window !== 'undefined' && window.dispatchStoryAREvent) {
      window.dispatchStoryAREvent(eventName, jsonPayload);
    }
  }
});
