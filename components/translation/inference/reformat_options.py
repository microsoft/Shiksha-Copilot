import re

def decode(text):
    parts = re.split(r'(ಎ\)|ಬಿ\)|ಸಿ\)|ಡಿ\))', text)
    result = []
    for i in range(1, len(parts), 2):
        result.append(parts[i] + parts[i+1])
    result = [part.rstrip(', -') for part in result]
    return result


def options_already_present(options, labels=["A", "B", "C", "D"]):
    """
    Make sure the length of options is 4
    """
    for i in range(4):
        if not options[i].startswith(labels[i]):
            return False
    return True

def encode(options):
    """
    Make sure the length of options is 4
    """
    labels = ["  - "]*4
    if(not (
        # options_already_present(options, ["A", "B", "C", "D"]) or
        # options_already_present(options, ["A.", "B.", "C.", "D."]) or
        options_already_present(options, ["A)", "B)", "C)", "D)"]) or
        options_already_present(options, ["a)", "b)", "c)", "d)"])
    )):
        labels = [
            "  - A) ",
            "  - B) ",
            "  - C) ",
            "  - D) "
        ]
    return ", ".join([i+option for i, option in zip(labels, options)])

if __name__=="__main__":
    output = decode("EXTRATEXTಎ) ಮಿಲಿಟರಿ ದಂಡಯಾತ್ರೆಗಳನ್ನು ಹೆಚ್ಚಿಸುವುದು, ಬಿ) ಶಾಂತಿಯನ್ನು ಮತ್ತು ಹಿಂಸಾಚಾರವನ್ನು ಪ್ರಚಾರ ಮಾಡುವುದು, ಸಿ) ವ್ಯಾಪಾರ ಮಾರ್ಗಗಳ ವಿಸ್ತರಣೆ, ಡಿ) ಜಾತಿ ವ್ಯವಸ್ಥೆಯ ಬಲವರ್ಧನೆEXTRATEXT" )
    output = encode([
                "10",
                "100",
                "1000",
                "10000"
              ])
    print(output)