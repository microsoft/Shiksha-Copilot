class LLMError(Exception):
    def __init__(self, message):
        super().__init__(message)

class QueueTimeoutError(Exception):
    def __init__(self, message):
        super().__init__(message)

class SchedulerQueueFullError(Exception):
    def __init__(self, message):
        super().__init__(message)

class ResourceAvailabilityError(Exception):
    def __init__(self, message):
        super().__init__(message)

class UserRateLimitExceededError(Exception):
    def __init__(self, message):
        super().__init__(message)

class UserIdHeaderMissingError(Exception):
    def __init__(self, message):
        super().__init__(message)