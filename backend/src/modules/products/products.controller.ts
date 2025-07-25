import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get()
  async getProducts(@Query('q') query?: string) {
    if (query) return this.productsService.searchProductsSemantic(query);
    return await this.productsService.getAllProducts();
  }

  @Get(':id')
  async getProductById(@Param('id') id: number) {
    return await this.productsService.getProductById(Number(id));
  }
}
