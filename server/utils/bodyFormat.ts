/**
 * 成功返回格式
 * @param data 返回的数据
 * @returns 
 */
export const successBody = <T>(data: T) => {
    return {
        code: 200,
        data: data,
        status: 'success',
        message: '成功'
    }
}

/**
 * 错误返回格式
 * @param message 错误信息
 * @returns 
 */
export const errorBody = (message: string) => {
    return {
        code: 500,
        data: null,
        status: 'error',
        message: message
    }
}