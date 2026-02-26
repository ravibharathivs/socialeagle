def calc(num1,num2,operator):
    if(operator=='+'):
        return num1+num2
    elif(operator=='-'):
        return num1-num2
    elif(operator=='*'):
        return num1*num2
    elif(operator=='/'):
        return num1/num2
    
if __name__ == '__main__':
    num1 = int(input("Enter the num1 : "))
    num2 = int(input("Enter the num2 : "))
    operator = input("Enter the operator ( + - * / ) to perform the operation : ")
    print(calc(num1,num2,operator))